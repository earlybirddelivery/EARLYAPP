# Seed & Mock Files Migration Plan
**Project:** EarlyBird Delivery Services  
**Phase:** Phase 3 - Backend Audit (STEP 18)  
**Date:** January 27, 2026  
**Status:** Ready for Execution

---

## Executive Summary

This document provides the step-by-step execution plan for migrating test and seed files based on findings from MOCK_TEST_SEED_AUDIT.md.

**Migration Tasks:**
1. Create `/tests/` directory
2. Move 3 test files to `/tests/`
3. Add "DEV ONLY" warnings to 3 seed files
4. Update 1 script reference in `/scripts/run_verification.sh`
5. Verify all functionality still works

**Total Time:** ~30 minutes

---

## PHASE 1: Create /tests/ Directory

### Task 1.1: Create directory structure
```powershell
# Create /tests/ directory
New-Item -ItemType Directory -Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests" -Force

# Verify creation
Get-Item "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests"
```

**Expected Output:**
```
Directory: c:\Users\xiaomi\Downloads\earlybird-emergent-main

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        1/27/2026  12:00 PM                tests
```

**Status:** ✅ Can execute immediately

---

## PHASE 2: Move Test Files

### Task 2.1: Move test_login.py
```powershell
# Verify file exists before moving
if (Test-Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_login.py") {
    Write-Host "✓ test_login.py found"
    Move-Item -Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_login.py" `
              -Destination "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\test_login.py" `
              -Force
    Write-Host "✓ Moved to tests/"
} else {
    Write-Host "✗ test_login.py not found"
}
```

**Verification:**
```powershell
# Verify old location is gone
Test-Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_login.py"  # Should be False

# Verify new location exists
Test-Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\test_login.py"  # Should be True
```

---

### Task 2.2: Move test_login_api.py
```powershell
# Move file
if (Test-Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_login_api.py") {
    Write-Host "✓ test_login_api.py found"
    Move-Item -Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_login_api.py" `
              -Destination "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\test_login_api.py" `
              -Force
    Write-Host "✓ Moved to tests/"
} else {
    Write-Host "✗ test_login_api.py not found"
}
```

---

### Task 2.3: Move test_acceptance.py
```powershell
# Move file
if (Test-Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_acceptance.py") {
    Write-Host "✓ test_acceptance.py found"
    Move-Item -Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_acceptance.py" `
              -Destination "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\test_acceptance.py" `
              -Force
    Write-Host "✓ Moved to tests/"
} else {
    Write-Host "✗ test_acceptance.py not found"
}
```

**Verification After All Moves:**
```powershell
# List /tests/ directory
Get-ChildItem "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\" -Filter "test_*.py"

# Expected output:
# test_acceptance.py
# test_login.py
# test_login_api.py

# Verify removed from /backend/
Get-ChildItem "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\" -Filter "test_*.py" | Measure-Object

# Expected: 0 files
```

---

## PHASE 3: Update Script References

### Task 3.1: Update run_verification.sh

**File:** `/scripts/run_verification.sh`  
**Current line 23:** `python3 /app/backend/test_acceptance.py`  
**New line 23:** `python3 /app/tests/test_acceptance.py`

**Before:**
```bash
# Run Python acceptance tests
echo "Running acceptance test suite..."
echo ""
python3 /app/backend/test_acceptance.py  ← OLD PATH

TEST_EXIT=$?
```

**After:**
```bash
# Run Python acceptance tests
echo "Running acceptance test suite..."
echo ""
python3 /app/tests/test_acceptance.py  ← NEW PATH

TEST_EXIT=$?
```

**Execution:**
This will be done via file edit tool in next phase.

---

## PHASE 4: Add DEV-ONLY Warnings to Seed Files

### Task 4.1: Update seed_data.py

Add warning at the very beginning of the file (before any imports):

**INSERT AT TOP (before existing imports):**
```python
"""
⚠️  DEV ONLY - Do not run in production!
This script resets user authentication data.
Running in production will erase all user passwords and role assignments.

USAGE: python seed_data.py
"""
```

**Current file starts with:**
```python
import asyncio
import uuid
from datetime import date
from database import db
from auth import hash_password
```

**Will become:**
```python
"""
⚠️  DEV ONLY - Do not run in production!
This script resets user authentication data.
Running in production will erase all user passwords and role assignments.

USAGE: python seed_data.py
"""

import asyncio
import uuid
from datetime import date
from database import db
from auth import hash_password
```

---

### Task 4.2: Update seed_phase0_v2.py

Add warning at the very beginning:

**INSERT AT TOP:**
```python
"""
⚠️  DEV ONLY - Do not run in production!
This script seeds Phase 0 V2 specific data (areas and delivery boys).
Running in production will overwrite all delivery area assignments.

USAGE: python seed_phase0_v2.py
"""
```

---

### Task 4.3: Update seed_sample_data.py

Add warning at the very beginning:

**INSERT AT TOP:**
```python
"""
⚠️  DEV ONLY - Do not run in production!
This script creates sample customer and subscription test data.
Running in production will pollute database with test records.

USAGE: python seed_sample_data.py
"""
```

---

## PHASE 5: Verification Steps

### Task 5.1: Verify directory structure
```powershell
# Check /tests/ exists and has test files
$testFiles = Get-ChildItem "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\" -Filter "*.py"
Write-Host "Files in /tests/:"
$testFiles | ForEach-Object { Write-Host "  ✓ $_" }

# Check /backend/ has no test files
$backendTestFiles = Get-ChildItem "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\" -Filter "test_*.py"
if ($backendTestFiles.Count -eq 0) {
    Write-Host "✓ No test files in /backend/"
} else {
    Write-Host "✗ Found test files still in /backend/:"
    $backendTestFiles | ForEach-Object { Write-Host "  ✗ $_" }
}
```

**Expected:**
```
✓ Files in /tests/:
  ✓ test_acceptance.py
  ✓ test_login.py
  ✓ test_login_api.py
✓ No test files in /backend/
```

---

### Task 5.2: Verify seed files have warnings
```powershell
# Check seed_data.py has warning
$content = Get-Content "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\seed_data.py" -Head 10
if ($content -like "*DEV ONLY*") {
    Write-Host "✓ seed_data.py has DEV ONLY warning"
} else {
    Write-Host "✗ seed_data.py missing warning"
}

# Same for other seed files
$seedFiles = @("seed_phase0_v2.py", "seed_sample_data.py")
foreach ($file in $seedFiles) {
    $path = "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\$file"
    $content = Get-Content $path -Head 10
    if ($content -like "*DEV ONLY*") {
        Write-Host "✓ $file has DEV ONLY warning"
    } else {
        Write-Host "✗ $file missing warning"
    }
}
```

---

### Task 5.3: Verify script update
```powershell
# Check run_verification.sh has correct path
$scriptContent = Get-Content "c:\Users\xiaomi\Downloads\earlybird-emergent-main\scripts\run_verification.sh"
if ($scriptContent -like "*python3 /app/tests/test_acceptance.py*") {
    Write-Host "✓ run_verification.sh points to correct path"
} else {
    Write-Host "⚠️  run_verification.sh not yet updated"
    Write-Host "   Current content references old path"
}
```

---

## Rollback Plan (If Needed)

**If something goes wrong during migration:**

### Rollback: Move test files back
```powershell
# Move test files back to /backend/
Move-Item -Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\test_login.py" `
          -Destination "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_login.py" -Force
Move-Item -Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\test_login_api.py" `
          -Destination "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_login_api.py" -Force
Move-Item -Path "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\test_acceptance.py" `
          -Destination "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_acceptance.py" -Force

# Revert run_verification.sh to use old path
# (Use git checkout or manual edit)
```

---

## Execution Timeline

| Task | Time | Status |
|------|------|--------|
| 1.1: Create /tests/ | 1 min | Ready |
| 2.1: Move test_login.py | 1 min | Ready |
| 2.2: Move test_login_api.py | 1 min | Ready |
| 2.3: Move test_acceptance.py | 1 min | Ready |
| 3.1: Update run_verification.sh | 2 min | Ready |
| 4.1: Add warning to seed_data.py | 1 min | Ready |
| 4.2: Add warning to seed_phase0_v2.py | 1 min | Ready |
| 4.3: Add warning to seed_sample_data.py | 1 min | Ready |
| 5.1: Verify directory structure | 2 min | Ready |
| 5.2: Verify seed warnings | 2 min | Ready |
| 5.3: Verify script update | 2 min | Ready |
| **TOTAL** | **~17 min** | **Ready** |

---

## Implementation Status

### ✅ COMPLETED
- [x] MOCK_TEST_SEED_AUDIT.md created (comprehensive analysis)
- [x] Migration plan documented (this file)

### 🔄 READY FOR EXECUTION (Next Phase)
- [ ] Create /tests/ directory
- [ ] Move 3 test files to /tests/
- [ ] Update run_verification.sh
- [ ] Add DEV-ONLY warnings to seed files
- [ ] Verify all changes

### ⏭️ FOLLOW-UP (Optional)
- [ ] Create /tests/__init__.py
- [ ] Create /tests/README.md with running instructions
- [ ] Update main README.md with test instructions
- [ ] Add pre-commit hook to prevent seed execution in prod

---

## Testing After Migration

### Test 1: Run test files from new location
```powershell
# Test 1: Run test_login.py from /tests/
cd "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests"
python test_login.py

# Expected: Should connect to MongoDB and print user info
# Output example:
# ✓ User found: Admin User - admin
# Has password: True
# Is active: True
```

### Test 2: Run test_login_api.py from new location
```powershell
# Start backend first
# cd backend; python -m uvicorn server:app --host 0.0.0.0 --port 8000 &

# Then run test
cd "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests"
python test_login_api.py

# Expected: Should connect to API and return login token
# Output example:
# 🔐 Testing login endpoint...
# URL: http://localhost:8000/api/auth/login
# ✓ Status: 200
# Response: {"access_token": "...", "token_type": "bearer"}
```

### Test 3: Run acceptance tests from new location
```powershell
# Start backend and database first
cd "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests"
python test_acceptance.py

# Expected: Should run all 5 tests (A-E) and pass
# Output example:
# ============================================================
# EarlyBird Delivery Services - Acceptance Test Suite
# ============================================================
#
# === TEST A: Boot & Health Check ===
# ✓ Health check
#   API is running
# ...
# ============================================================
# RESULTS:
#   Test A: PASS
#   Test B: PASS
#   ...
# Total: 5/5 tests passed
# ✓ ALL ACCEPTANCE TESTS PASSED
```

### Test 4: Run seed scripts from /backend/
```powershell
cd "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend"

# Should still work from /backend/ location
python seed_data.py

# Expected:
# Seeding database...
# [OK] Admin user created (admin@earlybird.com / admin123)
# [OK] Delivery boy created (delivery@earlybird.com / delivery123)
# [OK] Marketing staff created (marketing@earlybird.com / marketing123)
```

---

## Success Criteria

✅ **Migration is successful if:**
1. /tests/ directory exists
2. 3 test files are in /tests/ (not in /backend/)
3. 3 seed files still in /backend/ with DEV-ONLY warnings
4. run_verification.sh points to /app/tests/test_acceptance.py
5. All test files run successfully from new location
6. All seed files run successfully from /backend/
7. No code imports point to old locations
8. CI/CD pipeline still works (run_verification.sh still executes)

---

## Additional Notes

### Why keep seed files in /backend/?
- **Accessibility:** Developers often need to reseed data during development
- **Dependency on database.py:** Located in /backend/, easier to import from same directory
- **Development workflow:** `python seed_data.py` is simpler than `python ../backend/seed_data.py`
- **Convention:** Seed scripts are typically kept near production code in monolithic projects

### Why move test files to /tests/?
- **Separation:** Tests are not production code
- **Discoverability:** Developers expect tests in /tests/
- **CI/CD:** Standard location for test discovery tools
- **Best practice:** Aligns with Python conventions (tests/ or tests/ folder)
- **Maintainability:** Easier to find and manage all tests in one place

### Future improvements:
- Consider `/backend/scripts/seed_*.py` for seed files (separate folder)
- Add test configuration file (pytest.ini or conftest.py)
- Add GitHub Actions workflow for running tests
- Add test documentation in /tests/README.md

---

## Sign-Off

**Audit Completed By:** AI Agent (STEP 18)  
**Date:** January 27, 2026  
**Status:** Ready for execution  
**Next Step:** Execute migration tasks (Phase 1-5)  
**Estimated Time:** 30 minutes total

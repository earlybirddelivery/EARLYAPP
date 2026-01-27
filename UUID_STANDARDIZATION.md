# UUID_STANDARDIZATION: Standardize UUID Generation (STEP 29)

**Status:** 📋 PLANNING READY  
**Date:** 2024  
**Priority:** 🟡 MEDIUM (Data consistency)  
**Risk Level:** 🟡 MEDIUM (requires migration)  

---

## Problem

Inconsistent UUID generation patterns across codebase:

```
Current State:
├─ db.users: "550e8400-e29b-41d4-a716-446655440000" (pure UUID)
├─ db.orders: "order-123", "ord-456" (custom prefixed)
├─ db.customers_v2: "cust_789", "customer_abc123" (inconsistent)
├─ db.subscriptions_v2: "sub_xyz" (prefixed)
└─ db.products: "p_001", "product_123" (mixed)

Result: ❌ No consistency, hard to parse, type not obvious
```

---

## Solution: Two Options

### Option A: Pure UUID (36 characters with hyphens)

```
Format: 550e8400-e29b-41d4-a716-446655440000
Benefit: Standard UUID v4 format
Drawback: Type not obvious from ID
```

**Example IDs:**
```
User: 550e8400-e29b-41d4-a716-446655440000
Order: f47ac10b-58cc-4372-a567-0e02b2c3d479
Customer: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

---

### Option B: Prefixed UUID (domain prefix + UUID)

```
Format: {prefix}_{uuid}
Example: ord_550e8400-e29b-41d4-a716-446655440000

Benefit: Easy to identify object type
Drawback: Slightly longer IDs
```

**Example IDs:**
```
User: usr_550e8400-e29b-41d4-a716-446655440000
Order: ord_f47ac10b-58cc-4372-a567-0e02b2c3d479
Customer: cst_6ba7b810-9dad-11d1-80b4-00c04fd430c8
Subscription: sub_7b22e804-5e02-11d1-ba1c-00c04fd430c8
Product: prd_9f3af6a0-6f8e-11d1-8bc3-00c04fd430c8
Delivery: dlv_b4c0a4f2-7ac2-11d1-9fa3-00c04fd430c8
```

---

## Recommendation: Option B (Prefixed UUID)

**Why:**
✅ Easy to identify object type  
✅ Still uses standard UUID v4  
✅ Better for logging/debugging  
✅ Frontend can validate type  
✅ Database queries more readable  

---

## UUID Prefixes

| Object | Prefix | Example |
|--------|--------|---------|
| User | `usr` | usr_550e8400... |
| Customer | `cst` | cst_f47ac10b... |
| Order | `ord` | ord_6ba7b810... |
| Subscription | `sub` | sub_7b22e804... |
| Product | `prd` | prd_9f3af6a0... |
| Delivery Status | `dlv` | dlv_b4c0a4f2... |
| Payment | `pmt` | pmt_c3f5e9b1... |
| Billing Record | `bil` | bil_d6g2f4h0... |
| Shared Link | `lnk` | lnk_e9h3g7i1... |

---

## Implementation

### Step 1: Create UUID Generator Function

**File: `backend/utils/id_generator.py` (New)**

```python
import uuid

def generate_id(prefix: str) -> str:
    """Generate prefixed UUID: prefix_uuid-without-hyphens"""
    uid = str(uuid.uuid4())
    return f"{prefix}_{uid}"

def generate_user_id() -> str:
    return generate_id("usr")

def generate_order_id() -> str:
    return generate_id("ord")

def generate_customer_id() -> str:
    return generate_id("cst")

def generate_subscription_id() -> str:
    return generate_id("sub")

# ... etc for all object types
```

### Step 2: Update Models

**File: `backend/models.py`**

```python
from utils.id_generator import generate_user_id, generate_customer_id

class User(BaseModel):
    id: str = Field(default_factory=generate_user_id)
    # ... other fields

class Customer(BaseModel):
    id: str = Field(default_factory=generate_customer_id)
    # ... other fields
```

### Step 3: Update All Routes

**Replace:**
```python
new_user_id = str(uuid.uuid4())
```

**With:**
```python
new_user_id = generate_user_id()
```

---

## Migration Strategy

### Option A: Keep Existing IDs (Minimal Risk)

```
Pros: ✅ No migration required, safe
Cons: ❌ Inconsistent IDs forever
```

### Option B: Migrate (Recommended)

```
Pros: ✅ Consistent system long-term, clean
Cons: ❌ Migration effort, potential risk
```

**Migration Approach:**
1. Generate new IDs for all existing records
2. Create ID mapping table (old_id → new_id)
3. Update all references in foreign keys
4. Test thoroughly
5. Deploy

---

## Validation

### Validation Function

```python
import re

def is_valid_prefixed_id(id_str: str, prefix: str) -> bool:
    """Validate prefixed UUID format"""
    pattern = f"^{prefix}_[0-9a-f]{{8}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{12}}$"
    return bool(re.match(pattern, id_str.lower()))

# Usage:
if not is_valid_prefixed_id(user_id, "usr"):
    raise ValueError("Invalid user ID format")
```

---

## Testing

### Test Case 1: ID Generation

```python
user_id = generate_user_id()
assert user_id.startswith("usr_")
assert is_valid_prefixed_id(user_id, "usr")
```

### Test Case 2: Consistency

```
100 generated IDs all have correct prefix ✅
All are valid UUID format ✅
No duplicates in 1000 generations ✅
```

---

## Queries

### Find All Users with Correct ID Format

```javascript
db.users.find({
  id: {$regex: "^usr_[0-9a-f]{8}"}
})
```

### Find IDs with Old Format (for migration)

```javascript
db.users.find({
  id: {$not: {$regex: "^usr_"}}
})
```

---

**Status:** 📋 READY FOR IMPLEMENTATION  
**Priority:** 🟡 MEDIUM  
**Estimated Effort:** 4-6 hours  
**Risk:** 🟡 MEDIUM (migration complexity)  
**Recommendation:** Implement after critical fixes (STEPS 23-27)

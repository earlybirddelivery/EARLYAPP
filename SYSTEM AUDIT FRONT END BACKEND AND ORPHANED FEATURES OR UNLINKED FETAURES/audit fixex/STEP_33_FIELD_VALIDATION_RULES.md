# STEP 33: Field Validation Rules
**Date:** January 27, 2026  
**Phase:** 5 - Data Integrity Fixes  
**Status:** READY FOR IMPLEMENTATION  
**Objective:** Add Pydantic field validators to ensure all inputs meet business rules

---

## Overview

This step adds field-level validation to all Pydantic models. This prevents invalid data from being accepted before it reaches the database.

**Validation Levels:**
1. **Type Validation:** Pydantic automatically validates data types
2. **Format Validation:** Email, phone, date formats
3. **Length Validation:** Min/max string length, min/max numeric values
4. **Business Rule Validation:** Domain-specific rules (e.g., delivery date must be future)
5. **Enum Validation:** Status must be from defined enum

---

## Field Validation Strategy

### String Fields

**Rules:**
- Not empty (minimum length 1)
- Maximum length enforced
- No leading/trailing whitespace

**Example:**
```python
from pydantic import BaseModel, Field, field_validator

class Order(BaseModel):
    notes: Optional[str] = Field(None, min_length=0, max_length=500)
    
    @field_validator('notes')
    def validate_notes(cls, v):
        if v:
            v = v.strip()
            if len(v) == 0:
                raise ValueError('Notes cannot be empty after stripping whitespace')
        return v
```

### Email Fields

**Rules:**
- Valid email format
- Non-empty
- Case insensitive (store as lowercase)

**Implementation:**
- Use `EmailStr` from Pydantic
- Store as lowercase in database

### Phone Fields

**Rules:**
- 10 digits minimum
- Only digits (after removing spaces, hyphens)
- Valid country format (India: +91 or 0)

**Example:**
```python
from pydantic import BaseModel, field_validator
import re

class Customer(BaseModel):
    phone: str
    
    @field_validator('phone')
    def validate_phone(cls, v):
        # Remove common formatting characters
        cleaned = re.sub(r'[\s\-\(\)\.+]', '', v)
        
        # Check if valid format
        if not re.match(r'^[0-9]{10,13}$', cleaned):
            raise ValueError('Phone must be 10-13 digits')
        
        # Allow +91 or 0 prefix
        if cleaned.startswith('+91'):
            cleaned = '91' + cleaned[3:]
        elif cleaned.startswith('0'):
            cleaned = '91' + cleaned[1:]
        
        return cleaned
```

### Date/DateTime Fields

**Rules:**
- Valid date format
- Not in past (for future dates)
- Not too far in future
- Reasonable date range

**Example:**
```python
from pydantic import BaseModel, field_validator
from datetime import datetime, timedelta

class Delivery(BaseModel):
    delivery_date: datetime
    
    @field_validator('delivery_date')
    def validate_delivery_date(cls, v):
        now = datetime.now()
        
        # Must not be in past
        if v < now.replace(hour=0, minute=0, second=0, microsecond=0):
            raise ValueError('Delivery date cannot be in the past')
        
        # Must not be more than 90 days in future
        max_date = now + timedelta(days=90)
        if v > max_date:
            raise ValueError('Delivery date cannot be more than 90 days in future')
        
        return v
```

### Numeric Fields

**Rules:**
- Positive values (for prices, quantities)
- Within reasonable range
- Precision limits (e.g., prices to 2 decimals)

**Example:**
```python
from pydantic import BaseModel, Field, field_validator
from decimal import Decimal

class OrderItem(BaseModel):
    quantity: int = Field(gt=0, le=1000)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    
    @field_validator('price')
    def validate_price(cls, v):
        # Ensure price is reasonable (less than 1 lakh)
        if v > 100000:
            raise ValueError('Price seems unreasonably high. Maximum is ₹100,000')
        return v
```

### Enum Fields

**Rules:**
- Must be from predefined list
- Case-insensitive matching (convert to lowercase)

**Example:**
```python
from enum import Enum
from pydantic import BaseModel, field_validator

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class Order(BaseModel):
    status: OrderStatus
    
    @field_validator('status', mode='before')
    def validate_status(cls, v):
        if isinstance(v, str):
            v = v.lower()
        return v
```

---

## Implementation: Enhanced Models

### File: `backend/validators/field_validators.py`

```python
"""
Field validation functions - validators for all model fields
"""

import re
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Optional
from pydantic import field_validator, model_validator


# ============================================================================
# STRING VALIDATORS
# ============================================================================

def validate_string_field(value: Optional[str], min_length: int = 0, max_length: int = 255) -> Optional[str]:
    """Validate and clean string field"""
    if value is None:
        return None
    
    if not isinstance(value, str):
        raise ValueError(f"Expected string, got {type(value).__name__}")
    
    # Strip whitespace
    value = value.strip()
    
    # Check length
    if len(value) < min_length:
        raise ValueError(f"String must be at least {min_length} characters")
    
    if len(value) > max_length:
        raise ValueError(f"String cannot exceed {max_length} characters")
    
    return value if value else None


# ============================================================================
# PHONE VALIDATORS
# ============================================================================

def validate_phone(phone: str) -> str:
    """
    Validate and normalize phone number to Indian format
    
    Accepted formats:
    - 1234567890 (10 digits)
    - +91 1234567890 (with country code)
    - 91 1234567890 (with country code prefix)
    - +91-123-456-7890 (with formatting)
    
    Returns: Normalized phone (10 digits, no formatting)
    """
    if not phone or not isinstance(phone, str):
        raise ValueError("Phone must be a non-empty string")
    
    # Remove common formatting characters
    cleaned = re.sub(r'[\s\-\(\)\.+]', '', phone)
    
    # Remove country code if present
    if cleaned.startswith('91'):
        # Could be +91 or just 91
        if len(cleaned) == 12:  # 91 + 10 digits
            cleaned = cleaned[2:]
    elif cleaned.startswith('0'):
        # Indian format with leading 0
        cleaned = cleaned[1:]
    
    # Verify it's 10 digits now
    if not re.match(r'^[0-9]{10}$', cleaned):
        raise ValueError('Phone must be exactly 10 digits (or valid format with country code)')
    
    return cleaned


# ============================================================================
# EMAIL VALIDATORS
# ============================================================================

def validate_email(email: str) -> str:
    """
    Validate and normalize email
    - Convert to lowercase
    - Validate format
    """
    if not email or not isinstance(email, str):
        raise ValueError("Email must be a non-empty string")
    
    email = email.lower().strip()
    
    # Basic email validation
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValueError("Invalid email format")
    
    return email


# ============================================================================
# DATE VALIDATORS
# ============================================================================

def validate_delivery_date(delivery_date: datetime) -> datetime:
    """
    Validate delivery date
    - Must not be in past
    - Must not be more than 90 days in future
    """
    if not isinstance(delivery_date, (datetime, date)):
        raise ValueError(f"Expected datetime or date, got {type(delivery_date).__name__}")
    
    now = datetime.now()
    
    # Convert to datetime if it's just a date
    if isinstance(delivery_date, date) and not isinstance(delivery_date, datetime):
        delivery_date = datetime.combine(delivery_date, datetime.min.time())
    
    # Must not be in past
    if delivery_date < now.replace(hour=0, minute=0, second=0, microsecond=0):
        raise ValueError("Delivery date cannot be in the past")
    
    # Must not be more than 90 days in future
    max_date = now + timedelta(days=90)
    if delivery_date > max_date:
        raise ValueError("Delivery date cannot be more than 90 days in future")
    
    return delivery_date


def validate_birth_date(birth_date: date) -> date:
    """
    Validate birth date
    - Must be in past
    - Age must be between 18 and 100
    """
    if not isinstance(birth_date, date):
        raise ValueError(f"Expected date, got {type(birth_date).__name__}")
    
    today = date.today()
    
    # Must be in past
    if birth_date >= today:
        raise ValueError("Birth date must be in the past")
    
    # Calculate age
    age = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
    
    # Must be between 18 and 100
    if age < 18:
        raise ValueError("Must be at least 18 years old")
    
    if age > 100:
        raise ValueError("Invalid birth date (age exceeds 100 years)")
    
    return birth_date


# ============================================================================
# NUMERIC VALIDATORS
# ============================================================================

def validate_price(price: Decimal) -> Decimal:
    """
    Validate price field
    - Must be positive
    - Must be reasonable (less than 1 lakh)
    - Exactly 2 decimal places
    """
    if not isinstance(price, (int, float, Decimal)):
        raise ValueError(f"Expected numeric value, got {type(price).__name__}")
    
    price = Decimal(str(price))
    
    # Must be positive
    if price <= 0:
        raise ValueError("Price must be greater than 0")
    
    # Must be reasonable
    if price > Decimal('100000'):
        raise ValueError("Price seems unreasonably high (maximum ₹100,000)")
    
    # Check decimal places (max 2)
    if price.as_tuple().exponent < -2:
        raise ValueError("Price can have at most 2 decimal places")
    
    return price.quantize(Decimal('0.01'))


def validate_quantity(quantity: int) -> int:
    """
    Validate quantity field
    - Must be positive
    - Must be reasonable (less than 10000)
    """
    if not isinstance(quantity, int):
        raise ValueError(f"Expected integer, got {type(quantity).__name__}")
    
    # Must be positive
    if quantity <= 0:
        raise ValueError("Quantity must be greater than 0")
    
    # Must be reasonable
    if quantity > 10000:
        raise ValueError("Quantity seems unreasonably high (maximum 10,000)")
    
    return quantity


def validate_percentage(percentage: Decimal) -> Decimal:
    """
    Validate percentage field
    - Must be between 0 and 100
    """
    if not isinstance(percentage, (int, float, Decimal)):
        raise ValueError(f"Expected numeric value, got {type(percentage).__name__}")
    
    percentage = Decimal(str(percentage))
    
    if percentage < 0 or percentage > 100:
        raise ValueError("Percentage must be between 0 and 100")
    
    return percentage.quantize(Decimal('0.01'))


# ============================================================================
# LOCATION VALIDATORS
# ============================================================================

def validate_latitude(lat: float) -> float:
    """Validate latitude (-90 to 90)"""
    if not isinstance(lat, (int, float)):
        raise ValueError(f"Expected numeric value, got {type(lat).__name__}")
    
    if not -90 <= lat <= 90:
        raise ValueError("Latitude must be between -90 and 90")
    
    return float(lat)


def validate_longitude(lng: float) -> float:
    """Validate longitude (-180 to 180)"""
    if not isinstance(lng, (int, float)):
        raise ValueError(f"Expected numeric value, got {type(lng).__name__}")
    
    if not -180 <= lng <= 180:
        raise ValueError("Longitude must be between -180 and 180")
    
    return float(lng)


def validate_pincode(pincode: str) -> str:
    """
    Validate Indian pincode
    - Must be exactly 6 digits
    """
    if not isinstance(pincode, str):
        raise ValueError(f"Expected string, got {type(pincode).__name__}")
    
    cleaned = re.sub(r'[\s\-]', '', pincode)
    
    if not re.match(r'^[0-9]{6}$', cleaned):
        raise ValueError("Pincode must be exactly 6 digits")
    
    return cleaned


# ============================================================================
# UUID VALIDATORS
# ============================================================================

def validate_uuid_format(uuid_str: str) -> str:
    """
    Validate UUID format
    - Standard: 550e8400-e29b-41d4-a716-446655440000
    - Prefixed: ord_550e8400e29b41d4a716446655440000
    """
    if not isinstance(uuid_str, str):
        raise ValueError(f"Expected string, got {type(uuid_str).__name__}")
    
    # Standard UUID format (with hyphens)
    standard_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    
    # Prefixed UUID format (4 chars + _ + 32 hex chars)
    prefixed_pattern = r'^[a-z]{3,4}_[0-9a-f]{32}$'
    
    # No hyphens UUID
    nohyphen_pattern = r'^[0-9a-f]{32}$'
    
    if not any([
        re.match(standard_pattern, uuid_str),
        re.match(prefixed_pattern, uuid_str),
        re.match(nohyphen_pattern, uuid_str)
    ]):
        raise ValueError("Invalid UUID format")
    
    return uuid_str.lower()
```

---

## Updated Pydantic Models

### File: `backend/models_with_validators.py`

```python
"""
Enhanced models with field validators
"""

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import List, Optional
from datetime import datetime, date
from enum import Enum
from decimal import Decimal

from validators.field_validators import (
    validate_string_field,
    validate_phone,
    validate_email,
    validate_price,
    validate_quantity,
    validate_delivery_date,
    validate_latitude,
    validate_longitude,
    validate_pincode,
    validate_uuid_format
)


# ============================================================================
# USER MODELS
# ============================================================================

class UserCreate(BaseModel):
    """User creation with field validation"""
    
    email: EmailStr
    phone: str
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    
    @field_validator('phone')
    def validate_phone_field(cls, v):
        return validate_phone(v)
    
    @field_validator('name')
    def validate_name_field(cls, v):
        return validate_string_field(v, min_length=1, max_length=100)
    
    @field_validator('password')
    def validate_password_field(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


# ============================================================================
# PRODUCT MODELS
# ============================================================================

class ProductCreate(BaseModel):
    """Product creation with field validation"""
    
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=50)
    unit: str = Field(min_length=1, max_length=20)
    price: Decimal = Field(gt=0)
    
    @field_validator('price')
    def validate_price_field(cls, v):
        return validate_price(v)
    
    @field_validator('name', 'category', 'unit')
    def validate_string_fields(cls, v):
        return validate_string_field(v)


# ============================================================================
# ORDER MODELS
# ============================================================================

class OrderItemCreate(BaseModel):
    """Order item with validation"""
    
    product_id: str
    quantity: int = Field(gt=0, le=1000)
    price: Decimal = Field(gt=0)
    
    @field_validator('product_id')
    def validate_product_id(cls, v):
        return validate_uuid_format(v)
    
    @field_validator('quantity')
    def validate_qty(cls, v):
        return validate_quantity(v)
    
    @field_validator('price')
    def validate_price_field(cls, v):
        return validate_price(v)


class CreateOrderRequest(BaseModel):
    """Order creation request with validation"""
    
    items: List[OrderItemCreate] = Field(min_items=1)
    delivery_date: datetime
    subscription_id: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)
    
    @field_validator('delivery_date')
    def validate_delivery_date_field(cls, v):
        return validate_delivery_date(v)
    
    @field_validator('subscription_id')
    def validate_subscription_id(cls, v):
        if v:
            return validate_uuid_format(v)
        return v
    
    @field_validator('notes')
    def validate_notes_field(cls, v):
        if v:
            return validate_string_field(v, max_length=500)
        return v


# ============================================================================
# DELIVERY MODELS
# ============================================================================

class MarkDeliveredRequest(BaseModel):
    """Mark delivery request with validation"""
    
    order_id: str
    customer_id: str
    delivery_date: datetime
    notes: Optional[str] = Field(None, max_length=500)
    
    @field_validator('order_id', 'customer_id')
    def validate_ids(cls, v):
        return validate_uuid_format(v)
    
    @field_validator('delivery_date')
    def validate_delivery_date_field(cls, v):
        return validate_delivery_date(v)
    
    @field_validator('notes')
    def validate_notes_field(cls, v):
        if v:
            return validate_string_field(v, max_length=500)
        return v


# ============================================================================
# ADDRESS MODELS
# ============================================================================

class AddressCreate(BaseModel):
    """Address creation with validation"""
    
    label: str = Field(min_length=1, max_length=50)
    address_line1: str = Field(min_length=5, max_length=200)
    address_line2: Optional[str] = Field(None, max_length=200)
    city: str = Field(min_length=2, max_length=50)
    state: str = Field(min_length=2, max_length=50)
    pincode: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    @field_validator('pincode')
    def validate_pincode_field(cls, v):
        return validate_pincode(v)
    
    @field_validator('latitude')
    def validate_lat(cls, v):
        if v is not None:
            return validate_latitude(v)
        return v
    
    @field_validator('longitude')
    def validate_lng(cls, v):
        if v is not None:
            return validate_longitude(v)
        return v
    
    @field_validator('label', 'address_line1', 'address_line2', 'city', 'state')
    def validate_string_fields(cls, v):
        if v:
            return validate_string_field(v, min_length=1, max_length=200)
        return v


# ============================================================================
# CUSTOMER MODELS
# ============================================================================

class CustomerCreate(BaseModel):
    """Customer creation with field validation"""
    
    name: str = Field(min_length=1, max_length=100)
    phone: str
    address: str = Field(min_length=5, max_length=200)
    area: str = Field(min_length=1, max_length=50)
    
    @field_validator('phone')
    def validate_phone_field(cls, v):
        return validate_phone(v)
    
    @field_validator('name')
    def validate_name_field(cls, v):
        return validate_string_field(v, min_length=1, max_length=100)
    
    @field_validator('address', 'area')
    def validate_string_fields(cls, v):
        return validate_string_field(v)
```

---

## Testing Field Validators

**File:** `tests/test_field_validators.py`

```python
"""
Test field validation
"""

import pytest
from datetime import datetime, timedelta, date
from decimal import Decimal

from validators.field_validators import (
    validate_phone,
    validate_delivery_date,
    validate_price,
    validate_quantity,
    validate_latitude,
    validate_longitude,
    validate_pincode
)


class TestPhoneValidation:
    """Test phone number validation"""
    
    def test_valid_phone(self):
        assert validate_phone("1234567890") == "1234567890"
    
    def test_phone_with_country_code(self):
        assert validate_phone("91 9876543210") == "9876543210"
    
    def test_phone_with_formatting(self):
        assert validate_phone("98-765-43210") == "9876543210"
    
    def test_invalid_phone(self):
        with pytest.raises(ValueError):
            validate_phone("12345")  # Too short


class TestPriceValidation:
    """Test price validation"""
    
    def test_valid_price(self):
        result = validate_price(Decimal("99.99"))
        assert result == Decimal("99.99")
    
    def test_zero_price(self):
        with pytest.raises(ValueError):
            validate_price(Decimal("0"))
    
    def test_excessive_price(self):
        with pytest.raises(ValueError):
            validate_price(Decimal("999999"))


class TestDateValidation:
    """Test date validation"""
    
    def test_valid_future_date(self):
        tomorrow = datetime.now() + timedelta(days=1)
        result = validate_delivery_date(tomorrow)
        assert result is not None
    
    def test_past_date(self):
        yesterday = datetime.now() - timedelta(days=1)
        with pytest.raises(ValueError):
            validate_delivery_date(yesterday)
    
    def test_too_far_future(self):
        far_future = datetime.now() + timedelta(days=100)
        with pytest.raises(ValueError):
            validate_delivery_date(far_future)
```

---

## Deployment Checklist

- [ ] Create backend/validators/field_validators.py
- [ ] Create backend/models_with_validators.py (enhanced models)
- [ ] Add field validation tests
- [ ] Update all route endpoints to use enhanced models
- [ ] Test all validation paths
- [ ] Document error responses
- [ ] Add validation to routes_*.py files

---

## Error Response Examples

**Phone Validation Error:**
```json
{
    "detail": [
        {
            "type": "value_error",
            "loc": ["body", "phone"],
            "msg": "Phone must be exactly 10 digits (or valid format with country code)",
            "input": "123"
        }
    ]
}
```

**Price Validation Error:**
```json
{
    "detail": [
        {
            "type": "value_error",
            "loc": ["body", "items", 0, "price"],
            "msg": "Price seems unreasonably high (maximum ₹100,000)",
            "input": "1000000"
        }
    ]
}
```

**Date Validation Error:**
```json
{
    "detail": [
        {
            "type": "value_error",
            "loc": ["body", "delivery_date"],
            "msg": "Delivery date cannot be in the past",
            "input": "2025-01-01T10:00:00"
        }
    ]
}
```

---

## Next Steps

**After STEP 33 Complete:**
1. Run test suite for all field validators
2. Test error messages are clear and actionable
3. Proceed to STEP 34: Data Migration Playbook

---

**Status:** ✅ READY FOR IMPLEMENTATION  
**Estimated Time:** 2-3 hours  
**Complexity:** MEDIUM (testing required)  
**Risk:** LOW (validation only)  
**Testing:** HIGH priority - comprehensive test coverage

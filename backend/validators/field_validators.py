"""
Field validation functions - validators for all model fields
Provides reusable validation for strings, phones, emails, dates, numbers, locations, and UUIDs
"""

import re
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Optional


# ============================================================================
# STRING VALIDATORS
# ============================================================================

def validate_string_field(
    value: Optional[str],
    min_length: int = 0,
    max_length: int = 255,
    allow_empty: bool = False
) -> Optional[str]:
    """
    Validate and clean string field
    
    Args:
        value: String to validate
        min_length: Minimum length required
        max_length: Maximum length allowed
        allow_empty: If True, empty strings become None
        
    Returns:
        Cleaned string or None
        
    Raises:
        ValueError: If validation fails
    """
    if value is None:
        return None
    
    if not isinstance(value, str):
        raise ValueError(f"Expected string, got {type(value).__name__}")
    
    # Strip whitespace
    value = value.strip()
    
    # Handle empty strings
    if len(value) == 0:
        if allow_empty:
            return None
        elif min_length > 0:
            raise ValueError(f"String must be at least {min_length} characters")
        return None
    
    # Check length
    if len(value) < min_length:
        raise ValueError(f"String must be at least {min_length} characters")
    
    if len(value) > max_length:
        raise ValueError(f"String cannot exceed {max_length} characters")
    
    return value


# ============================================================================
# PHONE VALIDATORS
# ============================================================================

def validate_phone(phone: str) -> str:
    """
    Validate and normalize phone number to 10-digit format
    
    Accepted formats:
    - 1234567890 (10 digits)
    - +91 1234567890 (with country code)
    - 91 1234567890 (with country code prefix)
    - +91-123-456-7890 (with formatting)
    - 0 1234567890 (with leading 0)
    
    Returns:
        Normalized phone (10 digits, no formatting)
        
    Raises:
        ValueError: If phone format is invalid
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
    
    Rules:
    - Valid email format
    - Converted to lowercase
    - No leading/trailing whitespace
    
    Returns:
        Normalized email (lowercase)
        
    Raises:
        ValueError: If email format is invalid
    """
    if not email or not isinstance(email, str):
        raise ValueError("Email must be a non-empty string")
    
    email = email.lower().strip()
    
    # Basic email validation (RFC 5322 simplified)
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValueError("Invalid email format")
    
    # Check for common mistakes
    if '..' in email:
        raise ValueError("Email cannot contain consecutive dots")
    
    if email.startswith('.') or email.endswith('.'):
        raise ValueError("Email cannot start or end with a dot")
    
    return email


# ============================================================================
# DATE VALIDATORS
# ============================================================================

def validate_delivery_date(delivery_date: datetime) -> datetime:
    """
    Validate delivery date
    
    Rules:
    - Must not be in past
    - Must not be more than 90 days in future
    
    Args:
        delivery_date: Date/datetime to validate
        
    Returns:
        Validated datetime
        
    Raises:
        ValueError: If date is invalid
    """
    if not isinstance(delivery_date, (datetime, date)):
        raise ValueError(f"Expected datetime or date, got {type(delivery_date).__name__}")
    
    now = datetime.now()
    
    # Convert to datetime if it's just a date
    if isinstance(delivery_date, date) and not isinstance(delivery_date, datetime):
        delivery_date = datetime.combine(delivery_date, datetime.min.time())
    
    # Must not be in past (check at day level)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if delivery_date < today:
        raise ValueError("Delivery date cannot be in the past")
    
    # Must not be more than 90 days in future
    max_date = now + timedelta(days=90)
    if delivery_date > max_date:
        raise ValueError("Delivery date cannot be more than 90 days in future")
    
    return delivery_date


def validate_birth_date(birth_date: date) -> date:
    """
    Validate birth date
    
    Rules:
    - Must be in past
    - Age must be between 18 and 100
    
    Args:
        birth_date: Date to validate
        
    Returns:
        Validated date
        
    Raises:
        ValueError: If date is invalid
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

def validate_price(price) -> Decimal:
    """
    Validate price field
    
    Rules:
    - Must be positive
    - Must be reasonable (less than 1 lakh)
    - Exactly 2 decimal places
    
    Args:
        price: Price to validate (int, float, or Decimal)
        
    Returns:
        Validated Decimal with 2 decimal places
        
    Raises:
        ValueError: If price is invalid
    """
    if not isinstance(price, (int, float, Decimal)):
        raise ValueError(f"Expected numeric value, got {type(price).__name__}")
    
    try:
        price = Decimal(str(price))
    except:
        raise ValueError("Could not convert price to decimal")
    
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


def validate_quantity(quantity) -> int:
    """
    Validate quantity field
    
    Rules:
    - Must be positive integer
    - Must be reasonable (less than 10000)
    
    Args:
        quantity: Quantity to validate
        
    Returns:
        Validated integer
        
    Raises:
        ValueError: If quantity is invalid
    """
    if not isinstance(quantity, int):
        try:
            quantity = int(quantity)
        except:
            raise ValueError(f"Expected integer, got {type(quantity).__name__}")
    
    # Must be positive
    if quantity <= 0:
        raise ValueError("Quantity must be greater than 0")
    
    # Must be reasonable
    if quantity > 10000:
        raise ValueError("Quantity seems unreasonably high (maximum 10,000)")
    
    return quantity


def validate_percentage(percentage) -> Decimal:
    """
    Validate percentage field
    
    Rules:
    - Must be between 0 and 100
    - Maximum 2 decimal places
    
    Args:
        percentage: Percentage to validate
        
    Returns:
        Validated Decimal between 0 and 100
        
    Raises:
        ValueError: If percentage is invalid
    """
    if not isinstance(percentage, (int, float, Decimal)):
        raise ValueError(f"Expected numeric value, got {type(percentage).__name__}")
    
    try:
        percentage = Decimal(str(percentage))
    except:
        raise ValueError("Could not convert percentage to decimal")
    
    if percentage < 0 or percentage > 100:
        raise ValueError("Percentage must be between 0 and 100")
    
    return percentage.quantize(Decimal('0.01'))


# ============================================================================
# LOCATION VALIDATORS
# ============================================================================

def validate_latitude(lat) -> float:
    """
    Validate latitude (-90 to 90)
    
    Args:
        lat: Latitude value
        
    Returns:
        Validated float
        
    Raises:
        ValueError: If latitude is invalid
    """
    if not isinstance(lat, (int, float)):
        raise ValueError(f"Expected numeric value, got {type(lat).__name__}")
    
    lat = float(lat)
    
    if not -90 <= lat <= 90:
        raise ValueError("Latitude must be between -90 and 90")
    
    return lat


def validate_longitude(lng) -> float:
    """
    Validate longitude (-180 to 180)
    
    Args:
        lng: Longitude value
        
    Returns:
        Validated float
        
    Raises:
        ValueError: If longitude is invalid
    """
    if not isinstance(lng, (int, float)):
        raise ValueError(f"Expected numeric value, got {type(lng).__name__}")
    
    lng = float(lng)
    
    if not -180 <= lng <= 180:
        raise ValueError("Longitude must be between -180 and 180")
    
    return lng


def validate_pincode(pincode: str) -> str:
    """
    Validate Indian pincode
    
    Rules:
    - Must be exactly 6 digits
    - No letters or special characters
    
    Args:
        pincode: Pincode to validate
        
    Returns:
        Validated pincode (6 digits)
        
    Raises:
        ValueError: If pincode is invalid
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
    
    Accepted formats:
    - Standard: 550e8400-e29b-41d4-a716-446655440000
    - Prefixed: ord_550e8400e29b41d4a716446655440000
    - No hyphens: 550e8400e29b41d4a716446655440000
    
    Args:
        uuid_str: UUID string to validate
        
    Returns:
        Validated UUID (lowercase)
        
    Raises:
        ValueError: If UUID format is invalid
    """
    if not isinstance(uuid_str, str):
        raise ValueError(f"Expected string, got {type(uuid_str).__name__}")
    
    if not uuid_str or len(uuid_str) == 0:
        raise ValueError("UUID cannot be empty")
    
    # Standard UUID format (with hyphens)
    standard_pattern = r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    
    # Prefixed UUID format (3-4 chars + _ + 32 hex chars)
    prefixed_pattern = r'^[a-z]{3,4}_[0-9a-f]{32}$'
    
    # No hyphens UUID (32 hex chars)
    nohyphen_pattern = r'^[0-9a-fA-F]{32}$'
    
    valid = any([
        re.match(standard_pattern, uuid_str),
        re.match(prefixed_pattern, uuid_str),
        re.match(nohyphen_pattern, uuid_str)
    ])
    
    if not valid:
        raise ValueError("Invalid UUID format")
    
    return uuid_str.lower()


# ============================================================================
# BATCH VALIDATION
# ============================================================================

def validate_all_uuids(uuid_list: list) -> list:
    """
    Validate multiple UUIDs at once
    
    Args:
        uuid_list: List of UUID strings
        
    Returns:
        List of validated UUIDs
        
    Raises:
        ValueError: If any UUID is invalid
    """
    if not isinstance(uuid_list, list):
        raise ValueError("Expected list of UUIDs")
    
    validated = []
    errors = []
    
    for idx, uuid_str in enumerate(uuid_list):
        try:
            validated.append(validate_uuid_format(uuid_str))
        except ValueError as e:
            errors.append(f"UUID at index {idx}: {str(e)}")
    
    if errors:
        raise ValueError("Invalid UUIDs: " + ", ".join(errors))
    
    return validated

"""
Validators Package
Provides validation functions for all entity relationships (foreign keys)
"""

from .user_validators import (
    validate_user_exists,
    validate_user_role,
    validate_user_active
)

from .product_validators import (
    validate_product_exists,
    validate_products_exist,
    validate_product_available
)

from .subscription_validators import (
    validate_subscription_exists,
    validate_subscription_active,
    validate_subscription_can_be_billed
)

from .order_validators import (
    validate_order_exists,
    validate_order_can_be_delivered,
    validate_order_not_already_billed
)

from .customer_validators import (
    validate_customer_exists,
    validate_customer_user_link,
    validate_customer_active
)

__all__ = [
    # User validators
    "validate_user_exists",
    "validate_user_role",
    "validate_user_active",
    
    # Product validators
    "validate_product_exists",
    "validate_products_exist",
    "validate_product_available",
    
    # Subscription validators
    "validate_subscription_exists",
    "validate_subscription_active",
    "validate_subscription_can_be_billed",
    
    # Order validators
    "validate_order_exists",
    "validate_order_can_be_delivered",
    "validate_order_not_already_billed",
    
    # Customer validators
    "validate_customer_exists",
    "validate_customer_user_link",
    "validate_customer_active",
]

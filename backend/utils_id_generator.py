# STEP 29: UUID Standardization - Prefixed UUID Generator

"""
Standardized UUID generation with domain prefixes.
Enables easy identification of object types from IDs alone.
"""

import uuid


def generate_id(prefix: str) -> str:
    """
    Generate a prefixed UUID in format: prefix_uuid
    
    Args:
        prefix: Domain prefix (usr, ord, cst, sub, prd, dlv, pmt, bil, lnk)
    
    Returns:
        Prefixed UUID string (e.g., usr_550e8400-e29b-41d4-a716-446655440000)
    """
    uid = str(uuid.uuid4())
    return f"{prefix}_{uid}"


# Domain-specific ID generators

def generate_user_id() -> str:
    """Generate user ID with usr_ prefix"""
    return generate_id("usr")


def generate_customer_id() -> str:
    """Generate customer ID with cst_ prefix"""
    return generate_id("cst")


def generate_order_id() -> str:
    """Generate order ID with ord_ prefix"""
    return generate_id("ord")


def generate_subscription_id() -> str:
    """Generate subscription ID with sub_ prefix"""
    return generate_id("sub")


def generate_product_id() -> str:
    """Generate product ID with prd_ prefix"""
    return generate_id("prd")


def generate_delivery_id() -> str:
    """Generate delivery status ID with dlv_ prefix"""
    return generate_id("dlv")


def generate_payment_id() -> str:
    """Generate payment ID with pmt_ prefix"""
    return generate_id("pmt")


def generate_billing_id() -> str:
    """Generate billing record ID with bil_ prefix"""
    return generate_id("bil")


def generate_link_id() -> str:
    """Generate shared link ID with lnk_ prefix"""
    return generate_id("lnk")


# Validator functions to check ID format

def is_valid_user_id(user_id: str) -> bool:
    """Check if ID is valid user ID format"""
    return user_id.startswith("usr_") and len(user_id) == 41  # 4 + 1 + 36


def is_valid_order_id(order_id: str) -> bool:
    """Check if ID is valid order ID format"""
    return order_id.startswith("ord_") and len(order_id) == 41


def is_valid_customer_id(customer_id: str) -> bool:
    """Check if ID is valid customer ID format"""
    return customer_id.startswith("cst_") and len(customer_id) == 41


def is_valid_subscription_id(sub_id: str) -> bool:
    """Check if ID is valid subscription ID format"""
    return sub_id.startswith("sub_") and len(sub_id) == 41


def is_valid_product_id(product_id: str) -> bool:
    """Check if ID is valid product ID format"""
    return product_id.startswith("prd_") and len(product_id) == 41


def is_valid_delivery_id(delivery_id: str) -> bool:
    """Check if ID is valid delivery ID format"""
    return delivery_id.startswith("dlv_") and len(delivery_id) == 41


def is_valid_link_id(link_id: str) -> bool:
    """Check if ID is valid shared link ID format"""
    return link_id.startswith("lnk_") and len(link_id) == 41


# Extract object type from ID

def get_id_type(obj_id: str) -> str:
    """
    Extract object type from prefixed ID.
    
    Args:
        obj_id: Prefixed ID (e.g., usr_550e8400...)
    
    Returns:
        Object type or None if unrecognized
    """
    if not obj_id or "_" not in obj_id:
        return None
    
    prefix = obj_id.split("_")[0]
    type_map = {
        "usr": "user",
        "cst": "customer",
        "ord": "order",
        "sub": "subscription",
        "prd": "product",
        "dlv": "delivery",
        "pmt": "payment",
        "bil": "billing",
        "lnk": "link"
    }
    return type_map.get(prefix)


if __name__ == "__main__":
    # Example usage
    print("=== STEP 29: UUID Standardization Examples ===")
    print(f"User: {generate_user_id()}")
    print(f"Customer: {generate_customer_id()}")
    print(f"Order: {generate_order_id()}")
    print(f"Subscription: {generate_subscription_id()}")
    print(f"Product: {generate_product_id()}")
    print(f"Delivery: {generate_delivery_id()}")
    print(f"Payment: {generate_payment_id()}")
    print(f"Billing: {generate_billing_id()}")
    print(f"Link: {generate_link_id()}")

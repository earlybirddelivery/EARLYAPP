"""
Integration Test Module

Contains end-to-end tests for critical business workflows:
- Order creation and linkage
- Delivery confirmation and verification
- Billing generation with one-time orders
- User-customer linking and authentication
- Role-based permission enforcement

Each test simulates a complete user journey through the system.
"""

__all__ = [
    "test_order_creation_linkage",
    "test_delivery_confirmation_linkage",
    "test_billing_includes_one_time_orders",
    "test_user_customer_linking",
    "test_role_permissions",
]

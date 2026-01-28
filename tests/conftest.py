"""
Pytest Configuration and Shared Fixtures

This file provides:
1. Database fixtures (test database setup/teardown)
2. Authentication fixtures (test users, tokens)
3. Data fixtures (test orders, customers, deliveries)
4. HTTP client fixtures (for making API calls)
5. Helper utilities for common test operations

Fixtures are automatically available to all test files.
"""

import pytest
import asyncio
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import AsyncMock, MagicMock

# Note: These fixtures will be populated as we implement tests
# They serve as template/documentation for test infrastructure


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_db():
    """
    Fixture: Test Database Connection
    
    Setup: Connect to test MongoDB database
    Teardown: Clear test data after each test
    
    Usage:
        async def test_order_creation(test_db):
            result = await test_db.orders.insert_one({...})
    """
    # TODO: Implement database connection to test MongoDB
    yield {}
    # TODO: Cleanup test data


@pytest.fixture(scope="function")
def test_user_admin() -> Dict[str, Any]:
    """
    Fixture: Admin Test User
    
    Returns:
        Dict with admin user credentials for testing
        - id: User UUID
        - email: "admin@test.com"
        - role: "admin"
        - token: JWT token for authentication
    """
    return {
        "id": "user-admin-001",
        "email": "admin@test.com",
        "role": "admin",
        "name": "Test Admin",
        "token": "test-token-admin",
    }


@pytest.fixture(scope="function")
def test_user_customer() -> Dict[str, Any]:
    """
    Fixture: Customer Test User
    
    Returns:
        Dict with customer user credentials
        - id: User UUID
        - email: "customer@test.com"
        - role: "customer"
        - token: JWT token
    """
    return {
        "id": "user-customer-001",
        "email": "customer@test.com",
        "role": "customer",
        "name": "Test Customer",
        "token": "test-token-customer",
    }


@pytest.fixture(scope="function")
def test_user_delivery_boy() -> Dict[str, Any]:
    """
    Fixture: Delivery Boy Test User
    
    Returns:
        Dict with delivery boy credentials
        - id: User UUID
        - role: "delivery_boy"
        - token: JWT token
    """
    return {
        "id": "user-delivery-001",
        "role": "delivery_boy",
        "name": "Test Delivery Boy",
        "token": "test-token-delivery",
    }


@pytest.fixture(scope="function")
def test_order_one_time() -> Dict[str, Any]:
    """
    Fixture: One-Time Order Test Data
    
    Returns:
        Dict with sample one-time order
        - id: Order UUID
        - user_id: Customer ID
        - items: Order items
        - status: "pending"
        - delivery_date: Future date
    """
    return {
        "id": "order-001",
        "user_id": "user-customer-001",
        "items": [
            {
                "product_id": "prod-milk",
                "quantity": 2,
                "price": 50,
            },
            {
                "product_id": "prod-bread",
                "quantity": 1,
                "price": 30,
            },
        ],
        "status": "pending",
        "delivery_date": (datetime.now() + timedelta(days=1)).isoformat(),
        "total_amount": 130,
    }


@pytest.fixture(scope="function")
def test_subscription() -> Dict[str, Any]:
    """
    Fixture: Subscription Test Data
    
    Returns:
        Dict with sample subscription
        - id: Subscription UUID
        - customer_id: Customer ID
        - status: "active"
        - items: Recurring items
    """
    return {
        "id": "sub-001",
        "customer_id": "customer-001",
        "status": "active",
        "items": [
            {
                "product_id": "prod-milk",
                "quantity": 1,
                "frequency": "daily",
            }
        ],
    }


@pytest.fixture(scope="function")
def test_delivery_status() -> Dict[str, Any]:
    """
    Fixture: Delivery Status Test Data
    
    Returns:
        Dict with sample delivery confirmation
        - id: Delivery UUID
        - order_id: Order ID
        - customer_id: Customer ID
        - status: "delivered"
    """
    return {
        "id": "delivery-001",
        "order_id": "order-001",
        "customer_id": "customer-001",
        "delivery_date": datetime.now().isoformat(),
        "status": "delivered",
        "confirmed_by_user_id": "user-delivery-001",
        "confirmed_at": datetime.now().isoformat(),
    }


@pytest.fixture(scope="function")
def test_customer() -> Dict[str, Any]:
    """
    Fixture: Customer (Phase 0) Test Data
    
    Returns:
        Dict with sample customer data
        - id: Customer UUID
        - name: Customer name
        - phone: Phone number
        - address: Delivery address
    """
    return {
        "id": "customer-001",
        "name": "John Doe",
        "phone": "9876543210",
        "address": "123 Main St, City, State",
        "area": "downtown",
    }


@pytest.fixture(scope="function")
def api_headers(test_user_admin) -> Dict[str, str]:
    """
    Fixture: API Headers with Authorization
    
    Returns:
        Dict with common HTTP headers including auth token
    """
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {test_user_admin['token']}",
    }


# Utility Functions (Available to all tests)

def create_mock_db():
    """
    Create a mock database for unit testing.
    Returns AsyncMock with common database methods.
    """
    db = AsyncMock()
    db.orders = AsyncMock()
    db.subscriptions_v2 = AsyncMock()
    db.delivery_statuses = AsyncMock()
    db.customers_v2 = AsyncMock()
    db.users = AsyncMock()
    db.billing_records = AsyncMock()
    return db


def assert_order_valid(order: Dict[str, Any]) -> bool:
    """
    Assert order has all required fields.
    
    Args:
        order: Order document from database
        
    Returns:
        True if valid, raises AssertionError otherwise
    """
    required_fields = ["id", "user_id", "items", "status", "delivery_date"]
    for field in required_fields:
        assert field in order, f"Missing required field: {field}"
    return True


def assert_delivery_valid(delivery: Dict[str, Any]) -> bool:
    """
    Assert delivery has all required fields.
    """
    required_fields = ["id", "order_id", "customer_id", "status", "confirmed_at"]
    for field in required_fields:
        assert field in delivery, f"Missing required field: {field}"
    return True


def assert_billing_valid(billing: Dict[str, Any]) -> bool:
    """
    Assert billing record has all required fields.
    """
    required_fields = ["id", "customer_id", "total_amount", "items"]
    for field in required_fields:
        assert field in billing, f"Missing required field: {field}"
    return True


# Test Database Seeding

@pytest.fixture(scope="function")
async def seed_test_data(test_db):
    """
    Fixture: Populate test database with sample data.
    
    Creates:
    - Test users (admin, customer, delivery_boy)
    - Test orders (one-time and subscription)
    - Test customers
    - Test delivery statuses
    
    Available to tests that need pre-populated data.
    """
    # TODO: Implement test data seeding
    yield
    # TODO: Cleanup after test


# Markers for test categorization

def pytest_configure(config):
    """Register custom pytest markers."""
    config.addinivalue_line(
        "markers", "integration: marks test as integration test (deselect with '-m \"not integration\"')"
    )
    config.addinivalue_line(
        "markers", "smoke: marks test as smoke test"
    )
    config.addinivalue_line(
        "markers", "slow: marks test as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "critical: marks test as critical for production readiness"
    )

"""
EarlyBird Test Suite

This package contains all test modules for the EarlyBird Delivery Services system.

Test Structure:
- integration/: End-to-end integration tests (order creation → delivery → billing)
- smoke_tests.py: Quick endpoint verification tests
- conftest.py: Pytest configuration and fixtures

Running Tests:
    pytest tests/                           # All tests
    pytest tests/integration/               # Integration tests only
    pytest tests/smoke_tests.py            # Smoke tests only
    pytest -v tests/                       # Verbose output
    pytest --tb=short tests/               # Short traceback format
"""

__version__ = "1.0.0"
__author__ = "EarlyBird Dev Team"

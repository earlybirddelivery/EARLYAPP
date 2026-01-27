#!/bin/bash
set -e

echo "========================================"
echo "EarlyBird Delivery - Verification Suite"
echo "========================================"
echo ""

# Check if services are running
echo "Checking backend service..."
curl -f http://localhost:8001/api/ > /dev/null 2>&1 || {
    echo "ERROR: Backend not running on port 8001"
    echo "Please start with: sudo supervisorctl restart backend"
    exit 1
}

echo "✓ Backend is running"
echo ""

# Run Python acceptance tests
echo "Running acceptance test suite..."
echo ""
python3 /app/tests/test_acceptance.py

TEST_EXIT=$?

if [ $TEST_EXIT -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✓ VERIFICATION COMPLETE - ALL TESTS PASSED"
    echo "========================================"
    exit 0
else
    echo ""
    echo "========================================"
    echo "✗ VERIFICATION FAILED - SEE ERRORS ABOVE"
    echo "========================================"
    exit 1
fi

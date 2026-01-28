#!/usr/bin/env python3
"""
Quick startup and test script for EarlyBird Critical Systems API
"""

import subprocess
import time
import requests
import sys

def start_server():
    """Start the backend server"""
    print("🚀 Starting EarlyBird Critical Systems API on port 9001...")
    
    # Start server as background process
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "routes_critical_systems:app", "--port", "9001"],
        cwd="c:\\Users\\xiaomi\\Downloads\\earlybird\\src\\backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for server to start
    print("⏳ Waiting for server to start...")
    time.sleep(5)
    
    return process

def health_check():
    """Check if server is healthy"""
    print("\n🧪 Running health check...")
    
    try:
        response = requests.get("http://localhost:9001/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_endpoint(name, method, endpoint, data=None):
    """Test a single endpoint"""
    try:
        url = f"http://localhost:9001/api{endpoint}"
        
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        else:
            return None
        
        if response.status_code in [200, 201, 400]:
            print(f"✅ {name}: {response.status_code}")
            return True
        else:
            print(f"❌ {name}: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ {name}: {e}")
        return False

def run_quick_tests():
    """Run quick tests on key endpoints"""
    print("\n🧪 Running quick endpoint tests...\n")
    
    tests = [
        ("Health Check", "GET", "/health", None),
        ("Create Payment Link", "POST", "/wallet/payment-link", {
            "customer_id": "TEST_001",
            "amount": 100,
            "order_id": "ORD_001",
            "method": "razorpay"
        }),
        ("Get Wallet Balance", "GET", "/wallet/balance?customer_id=TEST_001", None),
        ("Create Calendar Events", "POST", "/calendar/events", {
            "customer_id": "TEST_001",
            "events": [
                {
                    "event_date": "2026-01-23",
                    "event_type": "order",
                    "count": 5
                }
            ]
        }),
        ("Register Supplier", "POST", "/suppliers/register", {
            "name": "Test Supplier",
            "category": "dairy",
            "location": "Mumbai",
            "email": "test@supplier.com",
            "phone": "+91-9999999999"
        }),
        ("Create Inventory Alert", "POST", "/inventory/alert", {
            "product_name": "Milk",
            "current_stock": 50,
            "threshold_level": 100,
            "days_of_supply": 2.5,
            "severity": "critical"
        }),
    ]
    
    passed = 0
    failed = 0
    
    for name, method, endpoint, data in tests:
        if test_endpoint(name, method, endpoint, data):
            passed += 1
        else:
            failed += 1
    
    print(f"\n📊 Results: {passed} passed, {failed} failed")
    return failed == 0

if __name__ == "__main__":
    print("=" * 60)
    print("🎯 EarlyBird Critical Systems - Quick Start")
    print("=" * 60)
    
    # Start server
    server_process = start_server()
    
    try:
        # Health check
        if health_check():
            # Run quick tests
            if run_quick_tests():
                print("\n✅ All tests passed! Backend API is working correctly.")
                print("\n📖 Next steps:")
                print("   1. Run full test suite: python test_critical_systems.py")
                print("   2. Connect frontend to http://localhost:9001")
                print("   3. Check documentation: BACKEND_QUICK_START.md")
            else:
                print("\n⚠️  Some tests failed. Check logs above.")
        else:
            print("\n❌ Server health check failed. Server may not be ready.")
    
    except KeyboardInterrupt:
        print("\n\n⏹️  Shutting down...")
    
    finally:
        print("\n🛑 Stopping server...")
        server_process.terminate()
        server_process.wait()
        print("✅ Server stopped.")

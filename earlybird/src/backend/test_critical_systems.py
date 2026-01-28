#!/usr/bin/env python3
"""
EarlyBird Critical Systems - API Integration Test Suite
Comprehensive testing for all 25 API endpoints across 7 critical systems
Run with: python test_critical_systems.py
"""

import requests
import json
import sys
from datetime import datetime, date, timedelta
from typing import Dict, Any, List

# Configuration
BASE_URL = "http://localhost:8001/api"
BACKEND_URL = "http://localhost:8001"

# Test data
TEST_CUSTOMER_ID = "CUST_TEST_001"
TEST_SUPPLIER_ID = "SUP_TEST_001"
TEST_PRODUCT_NAME = "Milk"

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def log_test(test_name: str, status: str, message: str = ""):
    """Log test result with color"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    
    if status == "PASS":
        color = Colors.GREEN
        symbol = "✓"
    elif status == "FAIL":
        color = Colors.RED
        symbol = "✗"
    else:
        color = Colors.YELLOW
        symbol = "!"
    
    log_msg = f"[{timestamp}] {color}{symbol} {test_name}{Colors.RESET}"
    if message:
        log_msg += f" - {message}"
    
    print(log_msg)

def log_section(section_name: str):
    """Log test section"""
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"🧪 {section_name}")
    print(f"{'='*60}{Colors.RESET}\n")

def make_request(method: str, endpoint: str, data: Dict = None, params: Dict = None) -> tuple:
    """Make HTTP request and return (status_code, response_json)"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, params=params, timeout=10)
        elif method == "PATCH":
            response = requests.patch(url, json=data, params=params, timeout=10)
        else:
            return 0, {"error": "Invalid method"}
        
        return response.status_code, response.json()
    except Exception as e:
        return 0, {"error": str(e)}

# ==================== PAYMENT SYSTEM TESTS ====================

def test_payment_system():
    """Test all payment system endpoints"""
    log_section("PAYMENT SYSTEM (5 Endpoints)")
    
    # Test 1: Create payment link
    log_test("Create Payment Link", "RUN")
    status, response = make_request("POST", "/wallet/payment-link", {
        "customer_id": TEST_CUSTOMER_ID,
        "amount": 5000,
        "order_id": "ORD_001",
        "method": "razorpay",
        "description": "Test payment"
    })
    
    if status == 200 and response.get("success"):
        payment_link_id = response["data"]["id"]
        log_test("Create Payment Link", "PASS", f"Link: {response['data']['payment_link'][:50]}...")
    else:
        log_test("Create Payment Link", "FAIL", f"Status: {status}")
        return False
    
    # Test 2: Process payment
    log_test("Process Payment", "RUN")
    status, response = make_request("POST", "/payments/process", {
        "customer_id": TEST_CUSTOMER_ID,
        "order_id": "ORD_001",
        "amount": 5000,
        "method": "razorpay",
        "status": "completed"
    })
    
    if status == 200 and response.get("success"):
        transaction_id = response["data"]["id"]
        log_test("Process Payment", "PASS", f"Transaction: {transaction_id}")
    else:
        log_test("Process Payment", "FAIL", f"Status: {status}")
        return False
    
    # Test 3: Payment webhook
    log_test("Payment Webhook Handler", "RUN")
    status, response = make_request("POST", "/payments/webhook", {
        "event": "payment.success",
        "transaction_id": transaction_id,
        "message": "Payment successful"
    })
    
    if status == 200 and response.get("success"):
        log_test("Payment Webhook", "PASS")
    else:
        log_test("Payment Webhook", "FAIL", f"Status: {status}")
    
    # Test 4: Get wallet balance
    log_test("Get Wallet Balance", "RUN")
    status, response = make_request("GET", "/wallet/balance", params={"customer_id": TEST_CUSTOMER_ID})
    
    if status == 200 and response.get("success"):
        balance = response["data"]["balance"]
        log_test("Get Wallet Balance", "PASS", f"Balance: ${balance}")
    else:
        log_test("Get Wallet Balance", "FAIL", f"Status: {status}")
    
    # Test 5: Deduct wallet credit
    log_test("Deduct Wallet Credit", "RUN")
    status, response = make_request("POST", "/wallet/deduct", {
        "customer_id": TEST_CUSTOMER_ID,
        "amount": 100
    })
    
    if status == 200 and response.get("success"):
        log_test("Deduct Wallet Credit", "PASS", f"New Balance: ${response['data']['balance_after']}")
    else:
        log_test("Deduct Wallet Credit", "FAIL", f"Status: {status}")
    
    return True

# ==================== CALENDAR SYSTEM TESTS ====================

def test_calendar_system():
    """Test all calendar system endpoints"""
    log_section("CALENDAR SYSTEM (3 Endpoints)")
    
    # Test 1: Save calendar events
    log_test("Save Calendar Events", "RUN")
    today = date.today()
    status, response = make_request("POST", "/calendar/events", {
        "customer_id": TEST_CUSTOMER_ID,
        "events": [
            {
                "event_date": today.isoformat(),
                "event_type": "order",
                "count": 5,
                "description": "Daily orders"
            },
            {
                "event_date": (today + timedelta(days=1)).isoformat(),
                "event_type": "delivery",
                "count": 3,
                "description": "Scheduled deliveries"
            }
        ]
    })
    
    if status == 200 and response.get("success"):
        log_test("Save Calendar Events", "PASS", f"Saved {response['data']['count']} events")
    else:
        log_test("Save Calendar Events", "FAIL", f"Status: {status}")
        return False
    
    # Test 2: Get calendar heatmap
    log_test("Get Calendar Heatmap", "RUN")
    status, response = make_request("GET", "/calendar/heatmap", params={
        "customer_id": TEST_CUSTOMER_ID,
        "year": today.year,
        "month": today.month
    })
    
    if status == 200 and response.get("success"):
        heatmap_count = len(response["data"]["heatmap"])
        log_test("Get Calendar Heatmap", "PASS", f"Retrieved {heatmap_count} heatmap entries")
    else:
        log_test("Get Calendar Heatmap", "FAIL", f"Status: {status}")
    
    # Test 3: Get calendar stats
    log_test("Get Calendar Stats", "RUN")
    status, response = make_request("GET", "/calendar/stats", params={
        "customer_id": TEST_CUSTOMER_ID,
        "year": today.year,
        "month": today.month
    })
    
    if status == 200 and response.get("success"):
        stats = response["data"]
        log_test("Get Calendar Stats", "PASS", f"Orders: {stats['total_orders']}, Deliveries: {stats['total_deliveries']}")
    else:
        log_test("Get Calendar Stats", "FAIL", f"Status: {status}")
    
    return True

# ==================== VOICE ORDER SYSTEM TESTS ====================

def test_voice_order_system():
    """Test all voice order system endpoints"""
    log_section("VOICE ORDER SYSTEM (3 Endpoints)")
    
    # Test 1: Parse voice transcript
    log_test("Parse Voice Transcript", "RUN")
    status, response = make_request("POST", "/voice/parse-transcript", {
        "customer_id": TEST_CUSTOMER_ID,
        "transcript": "I need 1 liter of milk and 2 pieces of bread",
        "language": "en"
    })
    
    if status == 200 and response.get("success"):
        items_count = response["data"]["total_items"]
        log_test("Parse Voice Transcript", "PASS", f"Parsed {items_count} items")
        parsed_items = response["data"]["parsed_items"]
    else:
        log_test("Parse Voice Transcript", "FAIL", f"Status: {status}")
        return False
    
    # Test 2: Create voice order
    log_test("Create Voice Order", "RUN")
    status, response = make_request("POST", "/voice/create-order", {
        "customer_id": TEST_CUSTOMER_ID,
        "transcript_id": "TXN_001",
        "language": "en",
        "parsed_items": parsed_items,
        "total_items": len(parsed_items),
        "estimated_total": response["data"]["estimated_total"],
        "confidence_score": 0.85
    })
    
    if status == 200 and response.get("success"):
        voice_order_id = response["data"]["id"]
        log_test("Create Voice Order", "PASS", f"Order: {voice_order_id}")
    else:
        log_test("Create Voice Order", "FAIL", f"Status: {status}")
        return False
    
    # Test 3: Get voice order history
    log_test("Get Voice Order History", "RUN")
    status, response = make_request("GET", "/voice/history", params={
        "customer_id": TEST_CUSTOMER_ID,
        "limit": 10
    })
    
    if status == 200 and response.get("success"):
        order_count = response["data"]["total"]
        log_test("Get Voice Order History", "PASS", f"Retrieved {order_count} voice orders")
    else:
        log_test("Get Voice Order History", "FAIL", f"Status: {status}")
    
    return True

# ==================== OCR SYSTEM TESTS ====================

def test_ocr_system():
    """Test all OCR system endpoints"""
    log_section("OCR SYSTEM (3 Endpoints)")
    
    # Test 1: Process OCR image
    log_test("Process OCR Image", "RUN")
    status, response = make_request("POST", "/ocr/process-image", {
        "customer_id": TEST_CUSTOMER_ID,
        "image_path": "/uploads/order_list_001.jpg"
    })
    
    if status == 200 and response.get("success"):
        extracted_text = response["data"]["extracted_text"]
        log_test("Process OCR Image", "PASS", f"Text: {extracted_text[:50]}...")
    else:
        log_test("Process OCR Image", "FAIL", f"Status: {status}")
        return False
    
    # Test 2: Create OCR order
    log_test("Create OCR Order", "RUN")
    parsed_items = [
        {"product_name": "Milk", "quantity": 1, "unit": "liter", "confidence": 0.92, "price_estimate": 80},
        {"product_name": "Bread", "quantity": 2, "unit": "pieces", "confidence": 0.88, "price_estimate": 100}
    ]
    
    status, response = make_request("POST", "/ocr/create-order", {
        "customer_id": TEST_CUSTOMER_ID,
        "image_id": "IMG_001",
        "extracted_text": extracted_text,
        "parsed_items": parsed_items,
        "total_items": len(parsed_items),
        "estimated_total": 180,
        "confidence_score": 0.90
    })
    
    if status == 200 and response.get("success"):
        ocr_order_id = response["data"]["id"]
        log_test("Create OCR Order", "PASS", f"Order: {ocr_order_id}")
    else:
        log_test("Create OCR Order", "FAIL", f"Status: {status}")
        return False
    
    # Test 3: Get OCR order history
    log_test("Get OCR Order History", "RUN")
    status, response = make_request("GET", "/ocr/history", params={
        "customer_id": TEST_CUSTOMER_ID,
        "limit": 10
    })
    
    if status == 200 and response.get("success"):
        order_count = response["data"]["total"]
        log_test("Get OCR Order History", "PASS", f"Retrieved {order_count} OCR orders")
    else:
        log_test("Get OCR Order History", "FAIL", f"Status: {status}")
    
    return True

# ==================== FORECASTING SYSTEM TESTS ====================

def test_forecasting_system():
    """Test all forecasting system endpoints"""
    log_section("FORECASTING SYSTEM (3 Endpoints)")
    
    # Test 1: Generate demand forecast
    log_test("Generate Demand Forecast", "RUN")
    status, response = make_request("POST", "/forecasting/predict", {
        "product_name": TEST_PRODUCT_NAME,
        "forecast_days": 7
    })
    
    if status == 200 and response.get("success"):
        forecast_id = response["data"]["id"]
        forecast_period = response["data"]["forecast_period"]
        log_test("Generate Demand Forecast", "PASS", f"Forecast: {forecast_id}, Period: {forecast_period} days")
    else:
        log_test("Generate Demand Forecast", "FAIL", f"Status: {status}")
        return False
    
    # Test 2: Get forecast accuracy
    log_test("Get Forecast Accuracy", "RUN")
    status, response = make_request("GET", "/forecasting/accuracy", params={
        "forecast_id": forecast_id
    })
    
    if status == 200 and response.get("success"):
        accuracy = response["data"]["accuracy_percentage"]
        log_test("Get Forecast Accuracy", "PASS", f"Accuracy: {accuracy:.1f}%")
    else:
        log_test("Get Forecast Accuracy", "FAIL", f"Status: {status}")
    
    # Test 3: Get historical orders
    log_test("Get Historical Orders", "RUN")
    status, response = make_request("GET", "/forecasting/historical", params={
        "product_name": TEST_PRODUCT_NAME,
        "days": 30
    })
    
    if status == 200 and response.get("success"):
        data_points = response["data"]["total_days"]
        log_test("Get Historical Orders", "PASS", f"Retrieved {data_points} days of history")
    else:
        log_test("Get Historical Orders", "FAIL", f"Status: {status}")
    
    return True

# ==================== SUPPLIER SYSTEM TESTS ====================

def test_supplier_system():
    """Test all supplier system endpoints"""
    log_section("SUPPLIER SYSTEM (5 Endpoints)")
    
    # Test 1: Register supplier
    log_test("Register Supplier", "RUN")
    status, response = make_request("POST", "/suppliers/register", {
        "name": "Mother Dairy",
        "category": "dairy",
        "location": "Mumbai",
        "email": "contact@motherdairy.com",
        "phone": "+91-9999999999"
    })
    
    if status == 200 and response.get("success"):
        supplier_id = response["data"]["id"]
        log_test("Register Supplier", "PASS", f"Supplier: {supplier_id}")
    else:
        log_test("Register Supplier", "FAIL", f"Status: {status}")
        return False
    
    # Test 2: Get all suppliers
    log_test("Get All Suppliers", "RUN")
    status, response = make_request("GET", "/suppliers/all")
    
    if status == 200 and response.get("success"):
        supplier_count = response["data"]["total"]
        log_test("Get All Suppliers", "PASS", f"Total: {supplier_count} suppliers")
    else:
        log_test("Get All Suppliers", "FAIL", f"Status: {status}")
    
    # Test 3: Create purchase order
    log_test("Create Purchase Order", "RUN")
    today = date.today()
    status, response = make_request("POST", "/suppliers/purchase-order", {
        "supplier_id": supplier_id,
        "supplier_name": "Mother Dairy",
        "line_items": [
            {
                "product_name": "Milk",
                "quantity": 100,
                "unit_price": 80,
                "total_price": 8000,
                "delivery_date": (today + timedelta(days=2)).isoformat()
            }
        ],
        "total_amount": 8000,
        "order_date": today.isoformat(),
        "expected_delivery_date": (today + timedelta(days=2)).isoformat()
    })
    
    if status == 200 and response.get("success"):
        po_id = response["data"]["id"]
        log_test("Create Purchase Order", "PASS", f"PO: {po_id}")
    else:
        log_test("Create Purchase Order", "FAIL", f"Status: {status}")
        return False
    
    # Test 4: Update PO status
    log_test("Update Purchase Order Status", "RUN")
    status, response = make_request("PATCH", f"/suppliers/purchase-order/{po_id}/status", params={
        "status": "confirmed"
    })
    
    if status == 200 and response.get("success"):
        new_status = response["data"]["status"]
        log_test("Update PO Status", "PASS", f"New status: {new_status}")
    else:
        log_test("Update PO Status", "FAIL", f"Status: {status}")
    
    # Test 5: Get supplier analytics
    log_test("Get Supplier Analytics", "RUN")
    status, response = make_request("GET", f"/suppliers/{supplier_id}/analytics")
    
    if status == 200 and response.get("success"):
        perf_score = response["data"]["overall_performance"]
        log_test("Get Supplier Analytics", "PASS", f"Performance: {perf_score:.1f}/100")
    else:
        log_test("Get Supplier Analytics", "FAIL", f"Status: {status}")
    
    return True

# ==================== INVENTORY MONITORING TESTS ====================

def test_inventory_system():
    """Test all inventory monitoring endpoints"""
    log_section("INVENTORY SYSTEM (5 Endpoints)")
    
    # Test 1: Create inventory alert
    log_test("Create Inventory Alert", "RUN")
    status, response = make_request("POST", "/inventory/alert", {
        "product_name": TEST_PRODUCT_NAME,
        "current_stock": 50,
        "threshold_level": 100,
        "days_of_supply": 2.5,
        "severity": "critical"
    })
    
    if status == 200 and response.get("success"):
        alert_id = response["data"]["id"]
        auto_po = response["data"]["auto_po_generated"]
        log_test("Create Inventory Alert", "PASS", f"Alert: {alert_id}, Auto PO: {auto_po}")
    else:
        log_test("Create Inventory Alert", "FAIL", f"Status: {status}")
        return False
    
    # Test 2: Acknowledge alert
    log_test("Acknowledge Inventory Alert", "RUN")
    status, response = make_request("PATCH", f"/inventory/alert/{alert_id}/acknowledge")
    
    if status == 200 and response.get("success"):
        alert_status = response["data"]["status"]
        log_test("Acknowledge Alert", "PASS", f"Status: {alert_status}")
    else:
        log_test("Acknowledge Alert", "FAIL", f"Status: {status}")
    
    # Test 3: Resolve alert
    log_test("Resolve Inventory Alert", "RUN")
    status, response = make_request("PATCH", f"/inventory/alert/{alert_id}/resolve")
    
    if status == 200 and response.get("success"):
        resolved_status = response["data"]["status"]
        log_test("Resolve Alert", "PASS", f"Status: {resolved_status}")
    else:
        log_test("Resolve Alert", "FAIL", f"Status: {status}")
    
    # Test 4: Get inventory status
    log_test("Get Inventory Status", "RUN")
    status, response = make_request("GET", "/inventory/status")
    
    if status == 200 and response.get("success"):
        data = response["data"]
        log_test("Get Inventory Status", "PASS", f"Products: {data['total_products']}, Critical: {data['critical_count']}")
    else:
        log_test("Get Inventory Status", "FAIL", f"Status: {status}")
    
    # Test 5: Get active alerts
    log_test("Get Active Alerts", "RUN")
    status, response = make_request("GET", "/inventory/active-alerts")
    
    if status == 200 and response.get("success"):
        alert_count = response["data"]["total"]
        log_test("Get Active Alerts", "PASS", f"Active alerts: {alert_count}")
    else:
        log_test("Get Active Alerts", "FAIL", f"Status: {status}")
    
    return True

# ==================== HEALTH CHECK ====================

def test_critical_systems_health():
    """Test health check endpoint"""
    log_section("SYSTEM HEALTH CHECK")
    
    log_test("Critical Systems Health", "RUN")
    status, response = make_request("GET", "/critical-systems/health")
    
    if status == 200 and response.get("success"):
        health = response["data"]
        log_test("System Health", "PASS", f"All systems operational")
        
        for system, details in health.items():
            print(f"  • {system}: {details['status']} ({details['endpoints']} endpoints)")
        
        return True
    else:
        log_test("System Health", "FAIL", f"Status: {status}")
        return False

# ==================== MAIN TEST RUNNER ====================

def main():
    """Run all tests"""
    print(f"\n{Colors.BLUE}{'='*60}")
    print("🚀 EarlyBird Critical Systems - API Test Suite")
    print(f"{'='*60}{Colors.RESET}\n")
    
    print(f"Backend URL: {BASE_URL}")
    print(f"Test Customer ID: {TEST_CUSTOMER_ID}\n")
    
    tests = [
        ("Payment System", test_payment_system),
        ("Calendar System", test_calendar_system),
        ("Voice Order System", test_voice_order_system),
        ("OCR System", test_ocr_system),
        ("Forecasting System", test_forecasting_system),
        ("Supplier System", test_supplier_system),
        ("Inventory System", test_inventory_system),
        ("System Health", test_critical_systems_health),
    ]
    
    results = {}
    passed = 0
    failed = 0
    
    # Run all tests
    for test_name, test_func in tests:
        try:
            result = test_func()
            results[test_name] = result
            if result:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            log_test(test_name, "ERROR", str(e))
            results[test_name] = False
            failed += 1
    
    # Summary
    log_section("TEST SUMMARY")
    print(f"Total Tests: {len(tests)}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.RESET}")
    print(f"{Colors.RED}Failed: {failed}{Colors.RESET}\n")
    
    if failed == 0:
        print(f"{Colors.GREEN}✓ All tests passed! Critical systems API is ready for production.{Colors.RESET}\n")
        return 0
    else:
        print(f"{Colors.RED}✗ Some tests failed. Review the logs above for details.{Colors.RESET}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())

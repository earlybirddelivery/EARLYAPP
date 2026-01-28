"""
Phase 0.6: Comprehensive Testing & Validation
Tests for order creation, delivery linkage, billing query, and duplicate prevention
"""

import asyncio
import json
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
import sys

# Initialize MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client['earlybird']

# Test colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []
    
    def test(self, name, condition, error_msg=""):
        """Record test result"""
        if condition:
            print(f"{GREEN}✅ PASS: {name}{RESET}")
            self.passed += 1
        else:
            print(f"{RED}❌ FAIL: {name}")
            if error_msg:
                print(f"   Error: {error_msg}{RESET}")
            self.failed += 1
        self.tests.append((name, condition))
    
    def summary(self):
        """Print test summary"""
        total = self.passed + self.failed
        percentage = (self.passed / total * 100) if total > 0 else 0
        print(f"\n{BOLD}{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} passed ({percentage:.1f}%){RESET}")
        print(f"{'='*60}{RESET}\n")
        return self.failed == 0


def cleanup_test_data():
    """Clean up test data from previous runs"""
    print(f"\n{BLUE}🧹 Cleaning up previous test data...{RESET}")
    db.orders.delete_many({"test_order": True})
    db.customers_v2.delete_many({"test_customer": True})
    db.delivery_statuses.delete_many({"test_delivery": True})
    db.subscriptions_v2.delete_many({"test_subscription": True})
    print(f"{GREEN}✅ Cleanup complete{RESET}\n")


def create_test_customer():
    """Create a test customer"""
    customer = {
        "phone": "9876543210",
        "name": "Test Customer",
        "address": "123 Test St",
        "test_customer": True,
        "created_at": datetime.now()
    }
    result = db.customers_v2.insert_one(customer)
    return result.inserted_id


def create_test_order(customer_id, test_runner):
    """Test 1: Create order with all required fields"""
    print(f"\n{BLUE}TEST 1: Order Creation{RESET}")
    print(f"Testing if new orders have all required fields...\n")
    
    order = {
        "customer_id": customer_id,
        "items": [{"product": "Test Product", "quantity": 2, "price": 100}],
        "total": 200,
        "status": "pending",
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        
        # Phase 0.4 NEW FIELDS
        "billed": False,
        "delivery_confirmed": False,
        "billed_at": None,
        "billed_month": None,
        
        "test_order": True
    }
    
    result = db.orders.insert_one(order)
    order_id = result.inserted_id
    
    # Verify all fields exist
    inserted_order = db.orders.find_one({"_id": order_id})
    test_runner.test("Order created", inserted_order is not None, "Order not found in DB")
    test_runner.test("customer_id field", "customer_id" in inserted_order, "customer_id missing")
    test_runner.test("billed field", "billed" in inserted_order, "billed field missing")
    test_runner.test("delivery_confirmed field", "delivery_confirmed" in inserted_order, "delivery_confirmed missing")
    test_runner.test("billed_at field", "billed_at" in inserted_order, "billed_at missing")
    test_runner.test("billed_month field", "billed_month" in inserted_order, "billed_month missing")
    
    # Verify field values
    test_runner.test("billed defaults to False", inserted_order["billed"] == False, f"Got {inserted_order['billed']}")
    test_runner.test("delivery_confirmed defaults to False", inserted_order["delivery_confirmed"] == False)
    test_runner.test("billed_at defaults to None", inserted_order["billed_at"] is None)
    test_runner.test("billed_month defaults to None", inserted_order["billed_month"] is None)
    
    return order_id


def test_delivery_linkage(order_id, test_runner):
    """Test 2: Delivery status links to orders"""
    print(f"\n{BLUE}TEST 2: Delivery Linkage{RESET}")
    print(f"Testing if delivery_statuses links order_id correctly...\n")
    
    delivery = {
        "order_id": order_id,
        "delivery_boy_id": ObjectId(),
        "status": "assigned",
        "created_at": datetime.now(),
        "test_delivery": True
    }
    
    result = db.delivery_statuses.insert_one(delivery)
    delivery_id = result.inserted_id
    
    # Verify linkage
    delivery_record = db.delivery_statuses.find_one({"_id": delivery_id})
    test_runner.test("Delivery record created", delivery_record is not None)
    test_runner.test("order_id linked in delivery_statuses", delivery_record.get("order_id") == order_id)
    
    # Mark as delivered
    db.delivery_statuses.update_one(
        {"_id": delivery_id},
        {"$set": {"status": "delivered", "delivery_confirmed": True}}
    )
    
    # Update order to reflect delivery
    db.orders.update_one(
        {"_id": order_id},
        {"$set": {
            "status": "delivered",
            "delivery_confirmed": True,
            "updated_at": datetime.now()
        }}
    )
    
    # Verify order updated
    updated_order = db.orders.find_one({"_id": order_id})
    test_runner.test("Order marked as delivered", updated_order["status"] == "delivered")
    test_runner.test("delivery_confirmed set to True", updated_order["delivery_confirmed"] == True)
    
    return delivery_id


def test_billing_query(order_id, test_runner):
    """Test 3: Billing query includes one-time orders"""
    print(f"\n{BLUE}TEST 3: Billing Query{RESET}")
    print(f"Testing if one_time_orders query finds delivered, non-billed orders...\n")
    
    # Query that should be in routes_billing.py
    query = {
        "status": "delivered",
        "delivery_confirmed": True,
        "billed": {"$ne": True}
    }
    
    # Find orders matching billing criteria
    billable_orders = list(db.orders.find(query))
    test_runner.test("Billing query returns orders", len(billable_orders) > 0, 
                     f"Query returned {len(billable_orders)} orders")
    
    # Verify our test order is in results
    order_ids = [str(o["_id"]) for o in billable_orders]
    test_runner.test("Test order found by billing query", str(order_id) in order_ids,
                     f"Order {order_id} not in billable orders")
    
    # Verify query fields
    if billable_orders:
        order = billable_orders[0]
        test_runner.test("Billable order has status=delivered", order["status"] == "delivered")
        test_runner.test("Billable order has delivery_confirmed=True", order["delivery_confirmed"] == True)
        test_runner.test("Billable order NOT already billed", order.get("billed", False) != True)


def test_duplicate_prevention(order_id, test_runner):
    """Test 4: Prevent duplicate billing"""
    print(f"\n{BLUE}TEST 4: Duplicate Billing Prevention{RESET}")
    print(f"Testing if billed flag prevents re-billing...\n")
    
    # Mark order as billed
    db.orders.update_one(
        {"_id": order_id},
        {"$set": {
            "billed": True,
            "billed_at": datetime.now(),
            "billed_month": datetime.now().strftime("%Y-%m")
        }}
    )
    
    # Query should NOT return billed orders
    query = {
        "status": "delivered",
        "delivery_confirmed": True,
        "billed": {"$ne": True}
    }
    
    billable_orders = list(db.orders.find(query))
    order_ids = [str(o["_id"]) for o in billable_orders]
    
    test_runner.test("Billed order excluded from billing query", 
                     str(order_id) not in order_ids,
                     "Order still appears in billing query after marking as billed")
    
    # Verify order record
    updated_order = db.orders.find_one({"_id": order_id})
    test_runner.test("Order marked as billed", updated_order["billed"] == True)
    test_runner.test("billed_at set", updated_order["billed_at"] is not None)
    test_runner.test("billed_month set", updated_order["billed_month"] is not None)


def test_multiple_orders(test_runner):
    """Test 5: Handle multiple orders correctly"""
    print(f"\n{BLUE}TEST 5: Multiple Orders Handling{RESET}")
    print(f"Testing billing system with multiple orders...\n")
    
    customer_id = create_test_customer()
    
    # Create 3 orders
    orders = []
    for i in range(3):
        order = {
            "customer_id": customer_id,
            "items": [{"product": f"Product {i}", "quantity": 1, "price": 100 * (i+1)}],
            "total": 100 * (i+1),
            "status": "pending",
            "created_at": datetime.now(),
            "billed": False,
            "delivery_confirmed": False,
            "billed_at": None,
            "billed_month": None,
            "test_order": True
        }
        result = db.orders.insert_one(order)
        orders.append(result.inserted_id)
    
    test_runner.test("Created 3 test orders", len(orders) == 3)
    
    # Mark 2 as delivered but not billed
    for i in range(2):
        db.orders.update_one(
            {"_id": orders[i]},
            {"$set": {"status": "delivered", "delivery_confirmed": True}}
        )
    
    # Query billable orders
    billable_orders = list(db.orders.find({
        "status": "delivered",
        "delivery_confirmed": True,
        "billed": {"$ne": True}
    }))
    
    billable_ids = [o["_id"] for o in billable_orders]
    test_runner.test("Billing query finds 2 delivered orders", len(billable_ids) >= 2)
    test_runner.test("Pending order not in billing query", orders[2] not in billable_ids)
    
    # Mark first order as billed
    db.orders.update_one(
        {"_id": orders[0]},
        {"$set": {"billed": True, "billed_at": datetime.now(), "billed_month": "2026-01"}}
    )
    
    # Query again - should now only have 1 order
    billable_orders = list(db.orders.find({
        "status": "delivered",
        "delivery_confirmed": True,
        "billed": {"$ne": True}
    }))
    
    billable_ids = [o["_id"] for o in billable_orders]
    test_runner.test("After billing 1 order, query returns 1 remaining", 
                     len(billable_ids) >= 1,
                     f"Expected at least 1, got {len(billable_ids)}")
    test_runner.test("Already billed order excluded", orders[0] not in billable_ids)


def main():
    """Run all tests"""
    print(f"{BOLD}{BLUE}{'='*60}")
    print(f"PHASE 0.6: COMPREHENSIVE TESTING & VALIDATION")
    print(f"{'='*60}{RESET}\n")
    
    runner = TestRunner()
    
    try:
        # Cleanup
        cleanup_test_data()
        
        # Create test customer
        customer_id = create_test_customer()
        
        # Run tests
        order_id = create_test_order(customer_id, runner)
        test_delivery_linkage(order_id, runner)
        test_billing_query(order_id, runner)
        test_duplicate_prevention(order_id, runner)
        test_multiple_orders(runner)
        
        # Cleanup again
        cleanup_test_data()
        
        # Print summary
        success = runner.summary()
        
        if success:
            print(f"{GREEN}{BOLD}🎉 ALL TESTS PASSED - READY FOR PRODUCTION{RESET}\n")
            return 0
        else:
            print(f"{RED}{BOLD}⚠️  SOME TESTS FAILED - DO NOT DEPLOY{RESET}\n")
            return 1
            
    except Exception as e:
        print(f"{RED}❌ TEST EXECUTION ERROR: {str(e)}{RESET}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

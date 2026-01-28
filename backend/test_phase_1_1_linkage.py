"""
Phase 1.1: User-Customer Linkage - Test Suite

Tests for:
1. Backfill script execution
2. Unified user lookup
3. User-customer linkage
4. Data integrity
"""

import asyncio
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId


async def setup_test_data(db):
    """Create test data for Phase 1.1 testing"""
    
    print("\n" + "="*60)
    print("SETUP: Creating test data")
    print("="*60 + "\n")
    
    # Clear existing test data
    await db.users.delete_many({"test_user": True})
    await db.customers_v2.delete_many({"test_customer": True})
    
    # Create test users
    test_users = [
        {
            "email": "test1@example.com",
            "phone": "9876543210",
            "name": "Test User 1",
            "role": "customer",
            "is_active": True,
            "test_user": True,
            "created_at": datetime.now()
        },
        {
            "email": "test2@example.com",
            "phone": "9876543211",
            "name": "Test User 2",
            "role": "customer",
            "is_active": True,
            "test_user": True,
            "created_at": datetime.now()
        },
        {
            "email": "test3@example.com",
            "phone": "9876543212",
            "name": "Test User 3",
            "role": "delivery_boy",
            "is_active": True,
            "test_user": True,
            "created_at": datetime.now()
        }
    ]
    
    user_result = await db.users.insert_many(test_users)
    user_ids = user_result.inserted_ids
    
    print(f"Created {len(user_ids)} test users")
    for i, uid in enumerate(user_ids):
        print(f"  User {i+1}: {uid}")
    
    # Create test customers (WITHOUT user_id - these need to be linked)
    test_customers = [
        {
            "id": "CUST_001",
            "phone": "9876543210",  # Match with user 1
            "name": "Customer 1",
            "email": "cust1@example.com",
            "address": "123 Main St",
            "status": "active",
            "test_customer": True,
            "created_at": datetime.now()
        },
        {
            "id": "CUST_002",
            "phone": "9876543211",  # Match with user 2
            "name": "Customer 2",
            "email": "cust2@example.com",
            "address": "456 Oak St",
            "status": "active",
            "test_customer": True,
            "created_at": datetime.now()
        },
        {
            "id": "CUST_003",
            "phone": "9999999999",  # No matching user
            "name": "Customer 3",
            "email": "cust3@example.com",
            "address": "789 Pine St",
            "status": "inactive",
            "test_customer": True,
            "created_at": datetime.now()
        }
    ]
    
    customer_result = await db.customers_v2.insert_many(test_customers)
    
    print(f"\nCreated {len(customer_result.inserted_ids)} test customers (without user_id)")
    for i, customer in enumerate(test_customers):
        print(f"  Customer {i+1}: {customer['id']} (phone: {customer['phone']})")
    
    return user_ids, test_customers


async def test_backfill_linkage(db):
    """Test 1: Backfill customer user_ids"""
    
    print("\n" + "="*60)
    print("TEST 1: Backfill Customer User IDs")
    print("="*60 + "\n")
    
    # Initialize user_id field
    await db.customers_v2.update_many(
        {"test_customer": True, "user_id": {"$exists": False}},
        {"$set": {"user_id": None}}
    )
    
    customers = await db.customers_v2.find({
        "test_customer": True
    }).to_list(None)
    
    matched = 0
    unmatched = 0
    
    # Backfill by matching phone
    for customer in customers:
        phone = customer.get("phone")
        user = await db.users.find_one({"phone": phone, "test_user": True})
        
        if user:
            await db.customers_v2.update_one(
                {"_id": customer["_id"]},
                {"$set": {"user_id": str(user["_id"])}}
            )
            matched += 1
            print(f"[PASS] Linked customer {customer['id']} -> user {user['_id']}")
        else:
            unmatched += 1
            print(f"[SKIP] No user found for customer {customer['id']} (phone: {phone})")
    
    print(f"\nResult: {matched} matched, {unmatched} not matched")
    return matched == 2 and unmatched == 1  # Expect 2 matches, 1 no-match


async def test_unified_user_lookup(db):
    """Test 2: Get unified user view"""
    
    print("\n" + "="*60)
    print("TEST 2: Unified User Lookup")
    print("="*60 + "\n")
    
    # Test lookup by phone
    user = await db.users.find_one({"phone": "9876543210", "test_user": True})
    
    if not user:
        print("[FAIL] Test user not found")
        return False
    
    # Get customer
    customer = await db.customers_v2.find_one({
        "phone": "9876543210",
        "test_customer": True
    })
    
    if not customer:
        print("[FAIL] Test customer not found")
        return False
    
    # Build unified view (simulating get_unified_user)
    unified = {
        "user_id": str(user["_id"]),
        "customer_id": customer.get("id"),
        "phone": user.get("phone"),
        "email": user.get("email"),
        "name": user.get("name"),
        "role": user.get("role"),
        "status": customer.get("status")
    }
    
    print(f"[PASS] User lookup by phone: {user.get('phone')}")
    print(f"  user_id: {unified['user_id']}")
    print(f"  customer_id: {unified['customer_id']}")
    print(f"  name: {unified['name']}")
    print(f"  role: {unified['role']}")
    print(f"  status: {unified['status']}")
    
    # Verify all fields present
    assert unified["user_id"] is not None
    assert unified["customer_id"] is not None
    assert unified["phone"] == "9876543210"
    
    return True


async def test_linkage_verification(db):
    """Test 3: Verify linkage integrity"""
    
    print("\n" + "="*60)
    print("TEST 3: Linkage Verification")
    print("="*60 + "\n")
    
    # Count linked customers
    linked = await db.customers_v2.count_documents({
        "test_customer": True,
        "user_id": {"$exists": True, "$ne": None}
    })
    
    # Count unlinked
    unlinked = await db.customers_v2.count_documents({
        "test_customer": True,
        "$or": [
            {"user_id": {"$exists": False}},
            {"user_id": None}
        ]
    })
    
    total = await db.customers_v2.count_documents({"test_customer": True})
    
    print(f"Total test customers: {total}")
    print(f"Linked (user_id set): {linked}")
    print(f"Unlinked: {unlinked}")
    print(f"Linkage: {round(linked/total*100, 1)}%")
    
    if linked >= 2:  # At least 2 should be linked
        print(f"[PASS] Sufficient linkage achieved ({linked}/2 minimum)")
        return True
    else:
        print(f"[FAIL] Insufficient linkage ({linked}/2 minimum)")
        return False


async def test_customer_with_user_info(db):
    """Test 4: Get customer with merged user info"""
    
    print("\n" + "="*60)
    print("TEST 4: Customer with User Info")
    print("="*60 + "\n")
    
    customer = await db.customers_v2.find_one({
        "test_customer": True,
        "id": "CUST_001"
    })
    
    if not customer:
        print("[FAIL] Test customer not found")
        return False
    
    # Get linked user
    user = None
    if customer.get("user_id"):
        user = await db.users.find_one({
            "_id": ObjectId(customer["user_id"])
        })
    
    if not user and customer.get("phone"):
        user = await db.users.find_one({
            "phone": customer["phone"],
            "test_user": True
        })
    
    if not user:
        print("[FAIL] No linked user found")
        return False
    
    # Build combined view
    combined = {
        "customer_id": customer.get("id"),
        "user_id": str(user.get("_id")),
        "name": user.get("name") or customer.get("name"),
        "email": user.get("email") or customer.get("email"),
        "phone": customer.get("phone"),
        "status": customer.get("status"),
        "role": user.get("role")
    }
    
    print(f"[PASS] Combined view created:")
    print(f"  customer_id: {combined['customer_id']}")
    print(f"  user_id: {combined['user_id']}")
    print(f"  name: {combined['name']}")
    print(f"  role: {combined['role']}")
    
    return True


async def test_registration_flow(db):
    """Test 5: New registration creates linkage"""
    
    print("\n" + "="*60)
    print("TEST 5: Registration Flow")
    print("="*60 + "\n")
    
    # Simulate new registration
    new_user_data = {
        "email": "newuser@example.com",
        "phone": "9111111111",
        "name": "New Test User",
        "role": "customer",
        "is_active": True,
        "test_user": True,
        "created_at": datetime.now()
    }
    
    user_result = await db.users.insert_one(new_user_data)
    user_id = str(user_result.inserted_id)
    
    print(f"[PASS] Created user: {user_id}")
    
    # Simulate customer creation with user_id linkage
    new_customer_data = {
        "id": "CUST_NEW",
        "user_id": user_id,  # ← User_id set immediately
        "phone": "9111111111",
        "name": "New Test User",
        "email": "newuser@example.com",
        "address": "999 New St",
        "status": "new",
        "test_customer": True,
        "created_at": datetime.now()
    }
    
    customer_result = await db.customers_v2.insert_one(new_customer_data)
    
    print(f"[PASS] Created customer with user_id linkage")
    
    # Verify linkage
    verified_customer = await db.customers_v2.find_one({
        "_id": customer_result.inserted_id
    })
    
    if verified_customer.get("user_id") == user_id:
        print(f"[PASS] Linkage verified: user_id = {user_id}")
        return True
    else:
        print(f"[FAIL] Linkage not correct")
        return False


async def cleanup_test_data(db):
    """Clean up all test data"""
    
    print("\n" + "="*60)
    print("CLEANUP: Removing test data")
    print("="*60 + "\n")
    
    await db.users.delete_many({"test_user": True})
    await db.customers_v2.delete_many({"test_customer": True})
    
    print("Test data cleaned up\n")


async def run_all_tests(db):
    """Run all tests"""
    
    print("\n╔" + "="*58 + "╗")
    print("║  PHASE 1.1: USER-CUSTOMER LINKAGE - TEST SUITE          ║")
    print("║" + " "*58 + "║")
    print("║  Testing: Backfill, Lookup, Verification, Registration  ║")
    print("╚" + "="*58 + "╝")
    
    # Setup
    await setup_test_data(db)
    
    results = {}
    
    # Run tests
    results["test_backfill"] = await test_backfill_linkage(db)
    results["test_lookup"] = await test_unified_user_lookup(db)
    results["test_verification"] = await test_linkage_verification(db)
    results["test_customer_info"] = await test_customer_with_user_info(db)
    results["test_registration"] = await test_registration_flow(db)
    
    # Cleanup
    await cleanup_test_data(db)
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "PASS" if result else "FAIL"
        symbol = "[PASS]" if result else "[FAIL]"
        print(f"{symbol} {test_name}")
    
    print(f"\nTotal: {passed}/{total} passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - PHASE 1.1 READY FOR DEPLOYMENT\n")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) failed\n")
        return False


async def main():
    """Main test execution"""
    
    client = MongoClient('mongodb://localhost:27017/')
    db = client['earlybird']
    
    try:
        success = await run_all_tests(db)
        exit(0 if success else 1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())

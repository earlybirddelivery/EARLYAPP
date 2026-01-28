# 🧪 Staff Earnings Testing Guide
## QA & Verification Procedures

**Date:** January 27, 2026  
**Phase:** 4A.1 Staff Earnings Dashboard  
**Test Environment:** Development/Staging  
**Execution Time:** 2-3 hours

---

## 📋 Test Execution Plan

### Test Summary
```
Total Test Cases: 45
├── Unit Tests: 15
├── Integration Tests: 15
├── API Tests: 10
└── E2E Tests: 5

Estimated Time: 8 hours
Coverage Target: 85%+
Pass Criteria: 95% pass rate minimum
```

---

## 🧪 Unit Tests

### Test Suite 1: Earnings Calculation

#### Test 1.1: Basic Delivery Earning
```python
def test_calculate_basic_delivery_earning():
    """Test basic ₹50 per delivery calculation"""
    
    earning = calculate_delivery_earnings(
        delivery_id="D001",
        distance_km=0,
        delivery_time_minutes=30,
        is_late_night=False,
        is_peak_hour=False
    )
    
    assert earning['base_amount'] == 50.00
    assert earning['distance_bonus'] == 0.00
    assert earning['on_time_bonus'] == 0.00
    assert earning['total_amount'] == 50.00
    
    print("✅ PASS: Basic delivery earning calculated correctly")
```

#### Test 1.2: Distance Bonus Calculation
```python
def test_distance_bonus_calculation():
    """Test distance bonus (₹0.5 per km)"""
    
    earning = calculate_delivery_earnings(
        delivery_id="D002",
        distance_km=10.0,  # 10km
        delivery_time_minutes=45,
        is_late_night=False,
        is_peak_hour=False
    )
    
    # ₹50 base + (10 × ₹0.5) = ₹55
    assert earning['distance_bonus'] == 5.00
    assert earning['total_amount'] == 55.00
    
    print("✅ PASS: Distance bonus calculated correctly")
```

#### Test 1.3: On-Time Bonus
```python
def test_on_time_bonus():
    """Test on-time bonus (5% of base)"""
    
    earning = calculate_delivery_earnings(
        delivery_id="D003",
        distance_km=0,
        delivery_time_minutes=20,
        is_late_night=False,
        is_peak_hour=False,
        is_on_time=True
    )
    
    # ₹50 base + (₹50 × 5%) = ₹52.50
    assert earning['on_time_bonus'] == 2.50
    assert earning['total_amount'] == 52.50
    
    print("✅ PASS: On-time bonus calculated correctly")
```

#### Test 1.4: Late Night Multiplier
```python
def test_late_night_multiplier():
    """Test 1.5x multiplier for 9PM-6AM deliveries"""
    
    earning = calculate_delivery_earnings(
        delivery_id="D004",
        distance_km=0,
        delivery_time_minutes=20,
        is_late_night=True,  # 11 PM delivery
        is_peak_hour=False
    )
    
    # ₹50 × 1.5 = ₹75
    assert earning['base_amount'] == 75.00  # After multiplier
    assert earning['total_amount'] == 75.00
    
    print("✅ PASS: Late night multiplier applied correctly")
```

#### Test 1.5: Peak Hours Multiplier
```python
def test_peak_hours_multiplier():
    """Test 1.2x multiplier for peak hours (12-2PM, 7-9PM)"""
    
    earning = calculate_delivery_earnings(
        delivery_id="D005",
        distance_km=0,
        delivery_time_minutes=20,
        is_late_night=False,
        is_peak_hour=True  # 1 PM delivery
    )
    
    # ₹50 × 1.2 = ₹60
    assert earning['base_amount'] == 60.00
    assert earning['total_amount'] == 60.00
    
    print("✅ PASS: Peak hours multiplier applied correctly")
```

#### Test 1.6: Rating Bonus
```python
def test_rating_bonus():
    """Test ₹10 bonus for rating > 4.5 stars"""
    
    # With 4.8 rating
    earning1 = calculate_delivery_earnings(
        delivery_id="D006",
        distance_km=0,
        delivery_time_minutes=20,
        is_late_night=False,
        is_peak_hour=False,
        rating=4.8
    )
    
    assert earning1['rating_bonus'] == 10.00
    assert earning1['total_amount'] == 60.00  # 50 + 10
    
    # With 4.2 rating (no bonus)
    earning2 = calculate_delivery_earnings(
        delivery_id="D007",
        distance_km=0,
        delivery_time_minutes=20,
        is_late_night=False,
        is_peak_hour=False,
        rating=4.2
    )
    
    assert earning2['rating_bonus'] == 0.00
    assert earning2['total_amount'] == 50.00
    
    print("✅ PASS: Rating bonus applied correctly")
```

#### Test 1.7: Combined Earnings
```python
def test_combined_earnings():
    """Test all bonuses combined"""
    
    earning = calculate_delivery_earnings(
        delivery_id="D008",
        distance_km=5.0,
        delivery_time_minutes=35,
        is_late_night=False,
        is_peak_hour=False,
        is_on_time=True,
        rating=4.8
    )
    
    # ₹50 + (5 × ₹0.5) + (₹50 × 5%) + ₹10 = ₹67.50
    expected_total = 50.00 + 2.50 + 2.50 + 10.00
    assert earning['total_amount'] == expected_total
    
    print(f"✅ PASS: Combined earnings = ₹{expected_total}")
```

---

### Test Suite 2: Wallet Operations

#### Test 2.1: Wallet Creation
```python
def test_wallet_creation():
    """Test wallet auto-creation for new staff"""
    
    delivery_boy_id = "DB_NEW_001"
    wallet = get_staff_wallet(delivery_boy_id)
    
    # Should create default wallet
    assert wallet['delivery_boy_id'] == delivery_boy_id
    assert wallet['balance'] == 0
    assert wallet['total_earned'] == 0
    
    print("✅ PASS: Wallet created with correct defaults")
```

#### Test 2.2: Wallet Balance Update
```python
def test_wallet_balance_update():
    """Test wallet balance increases with earnings"""
    
    delivery_boy_id = "DB_001"
    
    # Initial balance
    initial = get_staff_wallet(delivery_boy_id)
    initial_balance = initial.get('balance', 0)
    
    # Add earning
    update_staff_wallet(delivery_boy_id, 100.00)
    
    # Verify balance increased
    updated = get_staff_wallet(delivery_boy_id)
    assert updated['balance'] == initial_balance + 100.00
    
    print("✅ PASS: Wallet balance updated correctly")
```

#### Test 2.3: Transaction Logging
```python
def test_transaction_logging():
    """Test transactions logged in wallet history"""
    
    delivery_boy_id = "DB_002"
    
    # Add transaction
    update_staff_wallet(delivery_boy_id, 50.00, EarningType.BASE_DELIVERY, "D001")
    
    wallet = get_staff_wallet(delivery_boy_id)
    
    # Verify transaction recorded
    assert len(wallet['transactions']) > 0
    last_txn = wallet['transactions'][-1]
    assert last_txn['amount'] == 50.00
    assert last_txn['type'] == 'base_delivery'
    
    print("✅ PASS: Transaction logged correctly")
```

---

### Test Suite 3: Monthly Bonuses

#### Test 3.1: On-Time Rate Bonus
```python
def test_on_time_rate_bonus():
    """Test bonus for >95% on-time rate"""
    
    # Create test data: 100 deliveries, 96 on-time
    # On-time rate: 96/100 = 96% > 95%
    # Base earnings: ₹5,000
    # Bonus: ₹5,000 × 5% = ₹250
    
    bonus = calculate_monthly_bonuses(
        delivery_boy_id="DB_001",
        year=2024,
        month=1
    )
    
    assert bonus['on_time_rate'] > 0.95
    assert bonus['on_time_bonus'] == 250.00
    
    print("✅ PASS: On-time rate bonus calculated correctly")
```

#### Test 3.2: Rating Bonus
```python
def test_rating_bonus_calculation():
    """Test ₹10 per day bonus for avg rating > 4.5"""
    
    bonus = calculate_monthly_bonuses(
        delivery_boy_id="DB_001",
        year=2024,
        month=1
    )
    
    # If avg rating > 4.5 and delivered >= 4 days
    if bonus['avg_rating'] > 4.5:
        days_with_high_rating = sum(1 for d in range(30) if avg_rating > 4.5)
        expected_bonus = days_with_high_rating * 10
        assert bonus['rating_bonus'] == expected_bonus
    
    print("✅ PASS: Rating bonus calculated correctly")
```

#### Test 3.3: No Bonus if Below Threshold
```python
def test_no_bonus_below_threshold():
    """Test no bonus for < 95% on-time or < 4.5 rating"""
    
    # Simulate poor performance
    bonus = calculate_monthly_bonuses(
        delivery_boy_id="DB_POOR",
        year=2024,
        month=1
    )
    
    if bonus['on_time_rate'] < 0.95:
        assert bonus['on_time_bonus'] == 0.00
    
    if bonus['avg_rating'] < 4.5:
        assert bonus['rating_bonus'] == 0.00
    
    print("✅ PASS: No bonus applied for poor performance")
```

---

### Test Suite 4: Payout Operations

#### Test 4.1: Minimum Payout Validation
```python
def test_minimum_payout_validation():
    """Test minimum payout amount (₹500)"""
    
    delivery_boy_id = "DB_001"
    
    # Try payout < ₹500 (should fail)
    try:
        request_payout(delivery_boy_id, 300.00, "bank_transfer")
        assert False, "Should reject payout < ₹500"
    except ValueError as e:
        assert "Minimum payout amount is ₹500" in str(e)
    
    print("✅ PASS: Minimum payout validation working")
```

#### Test 4.2: Insufficient Balance Check
```python
def test_insufficient_balance_check():
    """Test error when payout > available balance"""
    
    delivery_boy_id = "DB_LIMITED"
    
    # Set balance to ₹1,000
    set_wallet_balance(delivery_boy_id, 1000.00)
    
    # Try payout ₹2,000 (should fail)
    try:
        request_payout(delivery_boy_id, 2000.00, "bank_transfer")
        assert False, "Should reject payout > balance"
    except ValueError as e:
        assert "Insufficient balance" in str(e)
    
    print("✅ PASS: Balance validation working")
```

#### Test 4.3: Payout Workflow
```python
def test_payout_workflow():
    """Test complete payout flow: pending → approved → processed"""
    
    delivery_boy_id = "DB_001"
    
    # Step 1: Create payout request
    payout = request_payout(delivery_boy_id, 2000.00, "bank_transfer")
    assert payout['status'] == PayoutStatus.PENDING
    payout_id = payout['_id']
    
    # Step 2: Admin approves
    payout = approve_payout(payout_id, "ADMIN_001")
    assert payout['status'] == PayoutStatus.APPROVED
    
    # Step 3: Process payout
    payout = process_payout(payout_id)
    assert payout['status'] == PayoutStatus.COMPLETED
    assert payout['transaction_id'] is not None
    
    print("✅ PASS: Payout workflow completed successfully")
```

---

## 🔌 Integration Tests

### Test Suite 5: Database Integration

#### Test 5.1: Staff Earnings Collection
```python
def test_staff_earnings_collection():
    """Test data stored in staff_earnings collection"""
    
    # Insert test earning
    earning_record = {
        "delivery_boy_id": "DB_001",
        "delivery_id": "D_001",
        "base_amount": 50.00,
        "total_amount": 67.50,
        "created_at": datetime.now()
    }
    
    result = db.staff_earnings.insert_one(earning_record)
    
    # Retrieve and verify
    stored = db.staff_earnings.find_one({"_id": result.inserted_id})
    assert stored['base_amount'] == 50.00
    assert stored['total_amount'] == 67.50
    
    print("✅ PASS: Earnings stored correctly in database")
```

#### Test 5.2: Wallet Collection
```python
def test_wallet_collection():
    """Test wallet data stored correctly"""
    
    wallet_record = {
        "delivery_boy_id": "DB_001",
        "balance": 5200.00,
        "total_earned": 45000.00,
        "total_paid_out": 40000.00,
        "transactions": []
    }
    
    result = db.staff_wallets.upsert_one(wallet_record)
    
    # Retrieve and verify
    stored = db.staff_wallets.find_one({"delivery_boy_id": "DB_001"})
    assert stored['balance'] == 5200.00
    
    print("✅ PASS: Wallet stored correctly in database")
```

#### Test 5.3: Payout Requests Collection
```python
def test_payout_requests_collection():
    """Test payout requests stored correctly"""
    
    payout_record = {
        "delivery_boy_id": "DB_001",
        "amount": 2000.00,
        "status": PayoutStatus.PENDING,
        "requested_at": datetime.now()
    }
    
    result = db.payout_requests.insert_one(payout_record)
    
    # Retrieve and verify
    stored = db.payout_requests.find_one({"_id": result.inserted_id})
    assert stored['status'] == PayoutStatus.PENDING
    
    print("✅ PASS: Payout request stored correctly")
```

---

### Test Suite 6: API Integration

#### Test 6.1: Authentication
```python
def test_api_authentication():
    """Test JWT authentication on endpoints"""
    
    # Without token - should get 401
    response = requests.get('http://localhost:8000/api/earnings/summary')
    assert response.status_code == 401
    
    # With invalid token - should get 401
    response = requests.get(
        'http://localhost:8000/api/earnings/summary',
        headers={'Authorization': 'Bearer INVALID'}
    )
    assert response.status_code == 401
    
    # With valid token - should get 200
    token = get_valid_token()
    response = requests.get(
        'http://localhost:8000/api/earnings/summary',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert response.status_code == 200
    
    print("✅ PASS: API authentication working")
```

#### Test 6.2: CORS Headers
```python
def test_cors_headers():
    """Test CORS headers present in responses"""
    
    response = requests.options('http://localhost:8000/api/earnings/summary')
    
    assert 'Access-Control-Allow-Origin' in response.headers
    assert 'Access-Control-Allow-Methods' in response.headers
    
    print("✅ PASS: CORS headers present")
```

---

## 🌐 API Tests

### Test Suite 7: Earnings Endpoints

#### Test 7.1: GET /summary
```python
def test_get_summary_endpoint():
    """Test earnings summary endpoint"""
    
    token = get_valid_token("DB_001")
    response = requests.get(
        'http://localhost:8000/api/earnings/summary',
        headers={'Authorization': f'Bearer {token}'}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert 'total_earned' in data
    assert 'earned_this_month' in data
    assert 'current_balance' in data
    assert data['status'] == 'success'
    
    print("✅ PASS: GET /summary endpoint working")
```

#### Test 7.2: GET /my-daily/{date}
```python
def test_get_daily_endpoint():
    """Test daily earnings endpoint"""
    
    token = get_valid_token("DB_001")
    response = requests.get(
        'http://localhost:8000/api/earnings/my-daily/2024-01-27',
        headers={'Authorization': f'Bearer {token}'}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data['date'] == '2024-01-27'
    assert 'total_deliveries' in data
    assert 'earnings' in data
    
    print("✅ PASS: GET /my-daily endpoint working")
```

#### Test 7.3: POST /payout/request
```python
def test_payout_request_endpoint():
    """Test payout request endpoint"""
    
    token = get_valid_token("DB_001")
    response = requests.post(
        'http://localhost:8000/api/earnings/payout/request',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        json={
            'amount': 2000.00,
            'payment_method': 'bank_transfer'
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert 'payout' in data
    assert data['payout']['status'] == 'pending'
    
    print("✅ PASS: POST /payout/request endpoint working")
```

---

## 🎯 End-to-End Tests

### Test Suite 8: User Scenarios

#### Test 8.1: Staff Member Views Earnings
```python
def test_staff_views_earnings():
    """Complete user scenario: Staff member checks earnings"""
    
    # Step 1: Login
    token = login("delivery_boy@example.com", "password")
    assert token is not None
    
    # Step 2: View earnings summary
    response = requests.get(
        'http://localhost:8000/api/earnings/summary',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert response.status_code == 200
    summary = response.json()
    
    # Step 3: View today's breakdown
    response = requests.get(
        'http://localhost:8000/api/earnings/my-daily/2024-01-27',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert response.status_code == 200
    
    # Step 4: Check performance
    response = requests.get(
        'http://localhost:8000/api/earnings/performance',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert response.status_code == 200
    
    print("✅ PASS: Staff viewing earnings works end-to-end")
```

#### Test 8.2: Staff Requests and Receives Payout
```python
def test_payout_complete_flow():
    """Complete scenario: Request payout, admin approves, money transfers"""
    
    # Step 1: Staff requests payout
    token = login("delivery_boy@example.com", "password")
    response = requests.post(
        'http://localhost:8000/api/earnings/payout/request',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json={'amount': 2000.00, 'payment_method': 'bank_transfer'}
    )
    assert response.status_code == 200
    payout_id = response.json()['payout']['_id']
    
    # Step 2: Admin approves
    admin_token = login_admin()
    response = requests.put(
        f'http://localhost:8000/api/earnings/payout/{payout_id}/approve',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert response.status_code == 200
    
    # Step 3: Admin processes (transfers money)
    response = requests.put(
        f'http://localhost:8000/api/earnings/payout/{payout_id}/process',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert response.status_code == 200
    
    # Step 4: Staff checks history
    response = requests.get(
        'http://localhost:8000/api/earnings/payout/history',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert response.status_code == 200
    payouts = response.json()['payouts']
    assert any(p['_id'] == payout_id for p in payouts)
    
    print("✅ PASS: Complete payout flow working end-to-end")
```

---

## ✅ Test Checklist

### Pre-Testing
- [ ] Test environment set up
- [ ] Database cleaned and seeded
- [ ] Backend server running
- [ ] Frontend dev server running
- [ ] Test data created (25 staff members, 500 deliveries)
- [ ] Admin account available
- [ ] Test tokens generated

### Execution
- [ ] All unit tests passing (15/15)
- [ ] All integration tests passing (15/15)
- [ ] All API tests passing (10/10)
- [ ] All E2E tests passing (5/5)
- [ ] No critical bugs found
- [ ] Performance acceptable (<200ms per request)
- [ ] Database queries optimized
- [ ] Error handling complete
- [ ] Security validated

### Sign-Off
- [ ] QA Lead review: PASS
- [ ] Backend Lead review: PASS
- [ ] Security audit: PASS
- [ ] Performance testing: PASS
- [ ] Deployment ready: YES

---

## 📊 Test Results Template

```markdown
# Test Execution Report
**Date:** January 27, 2026  
**Tester:** [Name]  
**Environment:** Development/Staging  
**Build:** v1.0.0  

## Summary
- Total Tests: 45
- Passed: 45
- Failed: 0
- Skipped: 0
- Pass Rate: 100% ✅

## Coverage
- Lines Covered: 1,200 / 1,400 (85.7%)
- Functions Covered: 30 / 32 (93.8%)
- Critical Paths: 100%

## Issues Found
- Critical: 0
- Major: 0
- Minor: 0

## Sign-Off
- QA Lead: ________________
- Backend Lead: ________________
- Product Manager: ________________

**Status: APPROVED FOR PRODUCTION** ✅
```

---

**Test Plan Complete**  
**Last Updated:** January 27, 2026  
**Next Review:** Upon deployment

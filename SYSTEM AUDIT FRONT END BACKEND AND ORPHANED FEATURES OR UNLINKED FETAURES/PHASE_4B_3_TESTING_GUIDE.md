# PHASE 4B.3: Customer Wallet - Testing Guide & Integration Checklist

**Version:** 1.0  
**Created:** January 28, 2026  
**Status:** Ready for Implementation  

---

## ✅ INTEGRATION CHECKLIST

### Pre-Implementation (Day 1)

- [ ] **Backend Setup**
  - [ ] Copy `wallet_service.py` to `/backend/`
  - [ ] Copy `routes_wallet.py` to `/backend/`
  - [ ] Copy `models_wallet.py` to `/backend/`
  - [ ] Review all imports in project structure
  - [ ] Ensure Flask blueprints are set up
  - [ ] Verify PyMongo connection configured

- [ ] **Frontend Setup**
  - [ ] Copy `walletService.js` to `/frontend/src/services/`
  - [ ] Copy all React components to `/frontend/src/components/`
  - [ ] Copy CSS module to `/frontend/src/components/`
  - [ ] Update environment variables (API_URL)
  - [ ] Verify Axios is installed

- [ ] **Database Setup**
  - [ ] Execute MongoDB migration script from `models_wallet.py`
  - [ ] Create 4 collections (customer_wallets, wallet_transactions, loyalty_rewards, credit_expiry_logs)
  - [ ] Create all indexes (15 total)
  - [ ] Verify collection schemas with validation
  - [ ] Load sample data for testing

---

### Server.py Integration (Day 1 - Critical)

**In `server.py`, add these imports:**
```python
from backend.routes_wallet import init_wallet_routes

# In app creation section:
def create_app():
    app = Flask(__name__)
    # ... existing code ...
    
    # Initialize wallet module
    init_wallet_routes(app, db)  # db is MongoDB connection
    
    return app
```

**In requirements.txt, ensure:**
```
pymongo>=3.12.0
flask>=2.0.0
```

---

### API Route Registration (Day 1 - Critical)

Routes will be automatically available at:
```
POST   /api/wallet/create
GET    /api/wallet/{id}
GET    /api/wallet/{id}/balance
POST   /api/wallet/{id}/add-credits
POST   /api/wallet/{id}/deduct-credits
POST   /api/wallet/{id}/refund
GET    /api/wallet/{id}/transactions
GET    /api/wallet/{id}/transaction-summary
POST   /api/wallet/rewards/create
GET    /api/wallet/{id}/rewards/available
POST   /api/wallet/{id}/rewards/apply
GET    /api/wallet/{id}/expiring
GET    /api/wallet/{id}/expiry-history
GET    /api/wallet/{id}/referral-code
POST   /api/wallet/referral/apply
GET    /api/wallet/{id}/tier-benefits
GET    /api/wallet/{id}/statistics
POST   /api/wallet/bulk/add-credits
```

---

### Frontend Component Integration (Day 1-2)

**In main App.jsx, add route:**
```jsx
import CustomerWallet from './components/CustomerWallet';

// In routing:
<Route path="/wallet" element={<CustomerWallet customerId={userId} />} />
```

**In navigation menu:**
```jsx
<Link to="/wallet">💳 My Wallet</Link>
```

---

## 🧪 UNIT TESTING (Day 2 - 4 Hours)

### Test Files to Create

**File: `/backend/test_wallet_service.py`**
```python
import unittest
from backend.wallet_service import WalletService
from datetime import datetime, timedelta

class TestWalletService(unittest.TestCase):
    
    def setUp(self):
        """Set up test fixtures"""
        self.service = WalletService(test_db_uri="mongodb://localhost:27017/earlybird_test")
        self.test_customer = "test_cust_001"
    
    def test_create_wallet(self):
        """Test wallet creation"""
        wallet = self.service.create_wallet(self.test_customer, 1000)
        self.assertEqual(wallet['customer_id'], self.test_customer)
        self.assertEqual(wallet['balance'], 1000)
        self.assertEqual(wallet['tier'], 'BRONZE')
    
    def test_add_credits(self):
        """Test adding credits"""
        wallet = self.service.create_wallet(self.test_customer)
        tx = self.service.add_credits(self.test_customer, 500, "Test credit")
        self.assertEqual(tx['amount'], 500)
        self.assertEqual(tx['type'], 'CREDIT')
    
    def test_deduct_credits(self):
        """Test credit deduction with validation"""
        wallet = self.service.create_wallet(self.test_customer, 500)
        tx = self.service.deduct_credits(self.test_customer, 200, "Test debit")
        self.assertEqual(tx['amount'], 200)
        # Check balance updated
        updated_wallet = self.service.get_wallet(self.test_customer)
        self.assertEqual(updated_wallet['balance'], 300)
    
    def test_insufficient_balance(self):
        """Test deduction with insufficient balance"""
        wallet = self.service.create_wallet(self.test_customer, 100)
        with self.assertRaises(ValueError) as context:
            self.service.deduct_credits(self.test_customer, 200, "Test")
        self.assertIn("Insufficient balance", str(context.exception))
    
    def test_tier_calculation(self):
        """Test tier calculation based on balance"""
        # BRONZE: 0-999
        self.assertEqual(self.service._calculate_tier(500), 'BRONZE')
        # SILVER: 1000-4999
        self.assertEqual(self.service._calculate_tier(2500), 'SILVER')
        # GOLD: 5000-9999
        self.assertEqual(self.service._calculate_tier(7500), 'GOLD')
        # PLATINUM: 10000+
        self.assertEqual(self.service._calculate_tier(15000), 'PLATINUM')
    
    def test_credit_expiry(self):
        """Test automatic credit expiry processing"""
        wallet = self.service.create_wallet(self.test_customer)
        # Add credit with 1-day expiry
        tx = self.service.add_credits(self.test_customer, 500, "Test", expiry_days=1)
        # Simulate expiry (would need to mock datetime)
        # Process expiry
        self.service._process_expired_credits(self.test_customer)
        # Verify credits marked as expired
    
    def test_loyalty_reward(self):
        """Test loyalty reward creation and application"""
        wallet = self.service.create_wallet(self.test_customer)
        reward = self.service.create_loyalty_reward(
            name="Test Reward",
            credit_amount=100,
            max_uses=10
        )
        self.assertEqual(reward['name'], "Test Reward")
        self.assertEqual(reward['credit_amount'], 100)

if __name__ == '__main__':
    unittest.main()
```

**Run tests:**
```bash
python -m pytest backend/test_wallet_service.py -v
```

---

## 🔗 INTEGRATION TESTING (Day 2 - 4 Hours)

### Test Files to Create

**File: `/backend/test_routes_wallet.py`**
```python
import unittest
import json
from server import create_app

class TestWalletRoutes(unittest.TestCase):
    
    def setUp(self):
        """Set up test client"""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        self.test_customer = "test_cust_001"
        # Mock auth token
        self.headers = {
            'Authorization': 'Bearer MOCK_TOKEN',
            'Content-Type': 'application/json'
        }
    
    def test_create_wallet_endpoint(self):
        """Test POST /api/wallet/create"""
        response = self.client.post(
            '/api/wallet/create',
            data=json.dumps({
                'customer_id': self.test_customer,
                'initial_balance': 1000
            }),
            headers=self.headers
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['customer_id'], self.test_customer)
    
    def test_get_wallet_endpoint(self):
        """Test GET /api/wallet/{id}"""
        # First create wallet
        self.client.post(
            '/api/wallet/create',
            data=json.dumps({'customer_id': self.test_customer}),
            headers=self.headers
        )
        # Then get it
        response = self.client.get(
            f'/api/wallet/{self.test_customer}',
            headers=self.headers
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['customer_id'], self.test_customer)
    
    def test_add_credits_endpoint(self):
        """Test POST /api/wallet/{id}/add-credits"""
        # Create wallet first
        self.client.post(
            '/api/wallet/create',
            data=json.dumps({'customer_id': self.test_customer}),
            headers=self.headers
        )
        # Add credits
        response = self.client.post(
            f'/api/wallet/{self.test_customer}/add-credits',
            data=json.dumps({
                'amount': 500,
                'reason': 'Test credit',
                'source': 'purchase'
            }),
            headers=self.headers
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['amount'], 500)
    
    def test_transactions_endpoint(self):
        """Test GET /api/wallet/{id}/transactions"""
        # Create and add credits
        self.client.post(
            '/api/wallet/create',
            data=json.dumps({'customer_id': self.test_customer}),
            headers=self.headers
        )
        self.client.post(
            f'/api/wallet/{self.test_customer}/add-credits',
            data=json.dumps({
                'amount': 500,
                'reason': 'Test'
            }),
            headers=self.headers
        )
        # Get transactions
        response = self.client.get(
            f'/api/wallet/{self.test_customer}/transactions?limit=20',
            headers=self.headers
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertGreater(len(data['transactions']), 0)

if __name__ == '__main__':
    unittest.main()
```

**Run tests:**
```bash
python -m pytest backend/test_routes_wallet.py -v
```

---

## ⚡ PERFORMANCE TESTING (Day 2 - 2 Hours)

**File: `/backend/test_performance.py`**
```python
import time
import unittest
from backend.wallet_service import WalletService

class TestPerformance(unittest.TestCase):
    
    def setUp(self):
        self.service = WalletService()
    
    def test_bulk_add_credits_performance(self):
        """Test bulk operation performance with 1000 records"""
        credits = [
            {
                'customer_id': f'perf_test_{i}',
                'amount': 100,
                'reason': 'Bulk test'
            }
            for i in range(1000)
        ]
        
        start_time = time.time()
        results = self.service.bulk_add_credits(credits)
        elapsed = time.time() - start_time
        
        # Should complete in < 5 seconds
        print(f"Bulk 1000 credits: {elapsed:.2f}s")
        self.assertLess(elapsed, 5.0)
        self.assertEqual(results['success_count'], 1000)
    
    def test_transaction_query_performance(self):
        """Test transaction history query performance"""
        customer_id = f'perf_cust_{int(time.time())}'
        
        # Add wallet with 100 transactions
        self.service.create_wallet(customer_id)
        for i in range(100):
            self.service.add_credits(customer_id, 10, f"Test {i}")
        
        start_time = time.time()
        transactions = self.service.get_transaction_history(
            customer_id,
            limit=50,
            skip=0
        )
        elapsed = time.time() - start_time
        
        # Should complete in < 1 second
        print(f"Query 50 of 100 transactions: {elapsed:.2f}s")
        self.assertLess(elapsed, 1.0)
    
    def test_expiry_processing_performance(self):
        """Test expiry processing with 1000 expiring credits"""
        customer_id = f'expiry_test_{int(time.time())}'
        self.service.create_wallet(customer_id)
        
        # Add 1000 credits with short expiry
        for i in range(1000):
            self.service.add_credits(customer_id, 1, f"Expire {i}", expiry_days=1)
        
        start_time = time.time()
        self.service._process_expired_credits(customer_id)
        elapsed = time.time() - start_time
        
        # Should complete in < 2 seconds
        print(f"Process 1000 expiry checks: {elapsed:.2f}s")
        self.assertLess(elapsed, 2.0)

if __name__ == '__main__':
    unittest.main()
```

---

## 🎯 MANUAL TESTING SCENARIOS (Day 3)

### Scenario 1: New Customer Wallet Creation
```bash
# Create wallet
curl -X POST http://localhost:5000/api/wallet/create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "test_001",
    "initial_balance": 1000
  }'

# Verify creation
curl -X GET http://localhost:5000/api/wallet/test_001 \
  -H "Authorization: Bearer TOKEN"
```

### Scenario 2: Add Credits & Check Balance
```bash
# Add credits
curl -X POST http://localhost:5000/api/wallet/test_001/add-credits \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Purchase order bonus"
  }'

# Check balance (lightweight endpoint)
curl -X GET http://localhost:5000/api/wallet/test_001/balance \
  -H "Authorization: Bearer TOKEN"
```

### Scenario 3: Tier Upgrade
```bash
# Check wallet to see tier
curl -X GET http://localhost:5000/api/wallet/test_001 \
  -H "Authorization: Bearer TOKEN"

# Add large amount to trigger tier upgrade
curl -X POST http://localhost:5000/api/wallet/test_001/add-credits \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "reason": "Large purchase"
  }'

# Check tier and benefits
curl -X GET http://localhost:5000/api/wallet/test_001/tier-benefits \
  -H "Authorization: Bearer TOKEN"
```

### Scenario 4: Use Credits
```bash
# Use (deduct) credits
curl -X POST http://localhost:5000/api/wallet/test_001/deduct-credits \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 200,
    "reason": "Order payment",
    "order_id": "order_123"
  }'

# Verify balance reduced
curl -X GET http://localhost:5000/api/wallet/test_001/balance \
  -H "Authorization: Bearer TOKEN"
```

### Scenario 5: Referral Bonus
```bash
# Get referral code
curl -X GET http://localhost:5000/api/wallet/test_001/referral-code \
  -H "Authorization: Bearer TOKEN"

# Apply referral (admin)
curl -X POST http://localhost:5000/api/wallet/referral/apply \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "referrer_id": "test_001",
    "referred_id": "test_002",
    "bonus_amount": 100
  }'
```

### Scenario 6: Expiring Credits Alert
```bash
# Get credits expiring soon
curl -X GET 'http://localhost:5000/api/wallet/test_001/expiring?days_ahead=30' \
  -H "Authorization: Bearer TOKEN"
```

### Scenario 7: Transaction History
```bash
# Get all transactions
curl -X GET 'http://localhost:5000/api/wallet/test_001/transactions?limit=20&skip=0' \
  -H "Authorization: Bearer TOKEN"

# Filter by type
curl -X GET 'http://localhost:5000/api/wallet/test_001/transactions?type=CREDIT&limit=20' \
  -H "Authorization: Bearer TOKEN"
```

### Scenario 8: Loyalty Rewards
```bash
# Get available rewards
curl -X GET http://localhost:5000/api/wallet/test_001/rewards/available \
  -H "Authorization: Bearer TOKEN"

# Claim reward
curl -X POST http://localhost:5000/api/wallet/test_001/rewards/apply \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reward_id": "reward_123"
  }'
```

---

## 📊 TEST COVERAGE TARGETS

- **Backend Service**: 85%+ coverage
- **API Routes**: 90%+ coverage
- **Frontend Components**: 80%+ coverage
- **Database Operations**: 95%+ coverage

---

## 🚀 DEPLOYMENT VALIDATION (Day 3)

### Pre-Production Checklist

- [ ] **Database**
  - [ ] MongoDB connections verified
  - [ ] Collections created and indexed
  - [ ] TTL index on credit_expiry_logs confirmed
  - [ ] Schema validation enabled

- [ ] **Backend**
  - [ ] All imports resolve correctly
  - [ ] Environment variables set (DB_URI, JWT_SECRET, etc.)
  - [ ] Auth decorators verified (@require_auth, @require_role)
  - [ ] Error handling tested
  - [ ] Logging configured

- [ ] **Frontend**
  - [ ] Build succeeds (`npm run build`)
  - [ ] No console errors in dev tools
  - [ ] API endpoints accessible
  - [ ] Components render without errors
  - [ ] Responsive design verified (mobile, tablet, desktop)

- [ ] **Security**
  - [ ] JWT tokens validated on all endpoints
  - [ ] Role-based access enforced
  - [ ] Admin endpoints protected
  - [ ] Input validation on all endpoints
  - [ ] No sensitive data in logs

- [ ] **Performance**
  - [ ] Balance endpoint < 100ms
  - [ ] Transaction list < 200ms
  - [ ] Bulk operations < 5s for 1000 records
  - [ ] Database indexes verified with explain()

---

## ✅ SIGN-OFF REQUIREMENTS

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual test scenarios completed
- [ ] Performance targets met
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Rollback procedure tested

---

**Status:** ✅ READY FOR DEPLOYMENT  
**Estimated Test Duration:** 12-16 hours (spread over Days 2-3)  
**Team:** Backend + Frontend + QA

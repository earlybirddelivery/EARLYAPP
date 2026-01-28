# Phase 1.4: Customer Activation Engine Tests
# Comprehensive test suite for activation pipeline

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, MagicMock

# Mock imports (in actual tests, these would be real)
from activation_engine import ActivationEngine, ActivationStatus


@pytest.fixture
async def mock_db():
    """Mock database for testing"""
    db = MagicMock()
    
    # Mock customers_v2 collection
    db.customers_v2 = AsyncMock()
    db.customers_v2.find_one = AsyncMock()
    db.customers_v2.update_one = AsyncMock()
    db.customers_v2.find = AsyncMock()
    db.customers_v2.count_documents = AsyncMock()
    db.customers_v2.aggregate = AsyncMock()
    
    # Mock orders collection
    db.orders = AsyncMock()
    db.orders.find_one = AsyncMock()
    db.orders.insert_one = AsyncMock()
    
    # Mock activation_events collection
    db.activation_events = AsyncMock()
    db.activation_events.insert_one = AsyncMock()
    
    return db


@pytest.fixture
async def engine(mock_db):
    """Create activation engine instance with mock DB"""
    return ActivationEngine(mock_db)


# ============================================================================
# TEST 1: Initialization Tests
# ============================================================================

class TestActivationInitialization:
    """Test customer activation initialization on signup"""
    
    @pytest.mark.asyncio
    async def test_initialize_customer_activation(self, engine, mock_db):
        """Test initializing activation for new customer"""
        customer_id = "CUST_001"
        customer_data = {
            "id": customer_id,
            "name": "John Doe",
            "phone": "9876543210",
            "email": "john@example.com"
        }
        
        # Mock update response
        mock_db.customers_v2.update_one.return_value = MagicMock(modified_count=1)
        
        result = await engine.initialize_customer_activation(customer_id, customer_data)
        
        assert result is True
        mock_db.customers_v2.update_one.assert_called_once()
        
        # Verify activation fields were set
        call_args = mock_db.customers_v2.update_one.call_args
        update_doc = call_args[0][1]["$set"]
        
        assert update_doc["activation_status"] == ActivationStatus.NEW
        assert update_doc["signup_date"] is not None
        assert update_doc["welcome_message_sent"] is False
        assert update_doc["onboarding_completed"] is False
    
    @pytest.mark.asyncio
    async def test_initialize_customer_already_initialized(self, engine, mock_db):
        """Test initializing customer that's already initialized"""
        customer_id = "CUST_001"
        
        # Mock no update (already initialized)
        mock_db.customers_v2.update_one.return_value = MagicMock(modified_count=0)
        
        result = await engine.initialize_customer_activation(customer_id, {})
        
        assert result is False


# ============================================================================
# TEST 2: First Order Tests
# ============================================================================

class TestFirstOrder:
    """Test customer's first order handling"""
    
    @pytest.mark.asyncio
    async def test_handle_first_order_transitions_new_to_onboarded(self, engine, mock_db):
        """Test first order transitions customer from NEW to ONBOARDED"""
        customer_id = "CUST_001"
        order_id = "ORD_001"
        order_amount = 500
        
        # Mock customer in NEW status
        mock_db.customers_v2.find_one.return_value = {
            "id": customer_id,
            "activation_status": ActivationStatus.NEW,
            "signup_date": datetime.now()
        }
        
        mock_db.customers_v2.update_one.return_value = MagicMock(modified_count=1)
        
        result = await engine.handle_first_order(customer_id, order_id, order_amount)
        
        assert result is True
        
        # Verify status changed to ONBOARDED
        call_args = mock_db.customers_v2.update_one.call_args
        update_doc = call_args[0][1]["$set"]
        
        assert update_doc["activation_status"] == ActivationStatus.ONBOARDED
        assert update_doc["first_order_date"] is not None
    
    @pytest.mark.asyncio
    async def test_handle_first_order_already_onboarded(self, engine, mock_db):
        """Test order for already-onboarded customer just updates last_order_date"""
        customer_id = "CUST_001"
        order_id = "ORD_002"
        
        # Mock customer already in ONBOARDED status
        mock_db.customers_v2.find_one.return_value = {
            "id": customer_id,
            "activation_status": ActivationStatus.ONBOARDED,
            "first_order_date": datetime.now() - timedelta(days=30)
        }
        
        mock_db.customers_v2.update_one.return_value = MagicMock(modified_count=1)
        
        result = await engine.handle_first_order(customer_id, order_id, 300)
        
        # Should not transition status
        assert result is False


# ============================================================================
# TEST 3: First Delivery Tests
# ============================================================================

class TestFirstDelivery:
    """Test customer's first delivery handling"""
    
    @pytest.mark.asyncio
    async def test_handle_first_delivery_transitions_to_active(self, engine, mock_db):
        """Test first delivery transitions customer to ACTIVE"""
        customer_id = "CUST_001"
        order_id = "ORD_001"
        
        # Mock customer in ONBOARDED status, no delivery yet
        mock_db.customers_v2.find_one.return_value = {
            "id": customer_id,
            "activation_status": ActivationStatus.ONBOARDED,
            "first_order_date": datetime.now(),
            "first_delivery_date": None
        }
        
        mock_db.customers_v2.update_one.return_value = MagicMock(modified_count=1)
        
        result = await engine.handle_first_delivery(customer_id, order_id)
        
        assert result is True
        
        # Verify status changed to ACTIVE
        call_args = mock_db.customers_v2.update_one.call_args
        update_doc = call_args[0][1]["$set"]
        
        assert update_doc["activation_status"] == ActivationStatus.ACTIVE
        assert update_doc["first_delivery_date"] is not None
        assert update_doc["onboarding_completed"] is True
    
    @pytest.mark.asyncio
    async def test_handle_delivery_already_active(self, engine, mock_db):
        """Test delivery for already-active customer just updates contact date"""
        customer_id = "CUST_001"
        order_id = "ORD_002"
        
        # Mock customer already ACTIVE with prior delivery
        mock_db.customers_v2.find_one.return_value = {
            "id": customer_id,
            "activation_status": ActivationStatus.ACTIVE,
            "first_delivery_date": datetime.now() - timedelta(days=5)
        }
        
        mock_db.customers_v2.update_one.return_value = MagicMock(modified_count=1)
        
        result = await engine.handle_first_delivery(customer_id, order_id)
        
        # Should not transition status (already active)
        assert result is False


# ============================================================================
# TEST 4: Status Update Tests
# ============================================================================

class TestStatusUpdates:
    """Test automatic status updates based on inactivity"""
    
    @pytest.mark.asyncio
    async def test_check_and_update_status_active_to_inactive(self, engine, mock_db):
        """Test ACTIVE customer becomes INACTIVE after 30+ days"""
        customer_id = "CUST_001"
        
        # Mock customer ACTIVE but with 45 days inactivity
        inactive_date = datetime.now() - timedelta(days=45)
        
        mock_db.customers_v2.find_one.return_value = {
            "id": customer_id,
            "activation_status": ActivationStatus.ACTIVE,
            "last_contact_date": inactive_date
        }
        
        mock_db.customers_v2.update_one.return_value = MagicMock(modified_count=1)
        
        result = await engine.check_and_update_status(customer_id)
        
        assert result == ActivationStatus.INACTIVE
        
        # Verify update
        call_args = mock_db.customers_v2.update_one.call_args
        update_doc = call_args[0][1]["$set"]
        
        assert update_doc["activation_status"] == ActivationStatus.INACTIVE
    
    @pytest.mark.asyncio
    async def test_check_and_update_status_inactive_to_churned(self, engine, mock_db):
        """Test INACTIVE customer becomes CHURNED after 60+ days"""
        customer_id = "CUST_001"
        
        # Mock customer INACTIVE with 65 days inactivity
        churned_date = datetime.now() - timedelta(days=65)
        
        mock_db.customers_v2.find_one.return_value = {
            "id": customer_id,
            "activation_status": ActivationStatus.INACTIVE,
            "last_contact_date": churned_date
        }
        
        mock_db.customers_v2.update_one.return_value = MagicMock(modified_count=1)
        
        result = await engine.check_and_update_status(customer_id)
        
        assert result == ActivationStatus.CHURNED
    
    @pytest.mark.asyncio
    async def test_check_and_update_status_no_change_if_recent(self, engine, mock_db):
        """Test recent customer status doesn't change"""
        customer_id = "CUST_001"
        
        # Mock customer ACTIVE with only 5 days inactivity
        recent_date = datetime.now() - timedelta(days=5)
        
        mock_db.customers_v2.find_one.return_value = {
            "id": customer_id,
            "activation_status": ActivationStatus.ACTIVE,
            "last_contact_date": recent_date
        }
        
        result = await engine.check_and_update_status(customer_id)
        
        # Should not change
        assert result is None


# ============================================================================
# TEST 5: Metrics Tests
# ============================================================================

class TestActivationMetrics:
    """Test activation metrics calculation"""
    
    @pytest.mark.asyncio
    async def test_get_activation_metrics(self, engine, mock_db):
        """Test getting overall activation metrics"""
        
        # Mock aggregation results
        aggregation_results = [
            {"_id": "new", "count": 50},
            {"_id": "onboarded", "count": 200},
            {"_id": "active", "count": 600},
            {"_id": "engaged", "count": 100},
            {"_id": "inactive", "count": 40},
            {"_id": "churned", "count": 10}
        ]
        
        async def mock_to_list(none_arg):
            return aggregation_results
        
        mock_agg = AsyncMock()
        mock_agg.to_list = mock_to_list
        mock_db.customers_v2.aggregate.return_value = mock_agg
        
        metrics = await engine.get_activation_metrics()
        
        assert metrics["total_customers"] == 1000
        assert metrics["new"] == 50
        assert metrics["onboarded"] == 200
        assert metrics["active"] == 600
        assert "conversion_funnel" in metrics
        assert "signup_to_first_order" in metrics["conversion_funnel"]
    
    @pytest.mark.asyncio
    async def test_get_customer_timeline(self, engine, mock_db):
        """Test getting customer activation timeline"""
        customer_id = "CUST_001"
        
        # Mock customer with full timeline
        mock_db.customers_v2.find_one.return_value = {
            "id": customer_id,
            "signup_date": datetime(2026, 1, 1),
            "first_order_date": datetime(2026, 1, 15),
            "first_delivery_date": datetime(2026, 1, 16),
            "activation_events": [
                {
                    "event": "STATUS_UPDATED",
                    "timestamp": datetime(2026, 1, 31),
                    "from_status": "active",
                    "to_status": "inactive"
                }
            ],
            "churn_date": None
        }
        
        timeline = await engine.get_customer_timeline(customer_id)
        
        assert len(timeline) > 0
        assert timeline[0]["event"] == "SIGNUP"
        assert any(e["event"] == "FIRST_ORDER" for e in timeline)
        assert any(e["event"] == "FIRST_DELIVERY" for e in timeline)


# ============================================================================
# TEST 6: Error Handling Tests
# ============================================================================

class TestErrorHandling:
    """Test error handling in activation engine"""
    
    @pytest.mark.asyncio
    async def test_handle_first_order_customer_not_found(self, engine, mock_db):
        """Test handling non-existent customer"""
        mock_db.customers_v2.find_one.return_value = None
        
        result = await engine.handle_first_order("NONEXISTENT", "ORD_001", 500)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_customer_status_not_found(self, engine, mock_db):
        """Test getting status for non-existent customer"""
        mock_db.customers_v2.find_one.return_value = None
        
        result = await engine.get_customer_status("NONEXISTENT")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_handle_database_error(self, engine, mock_db):
        """Test handling database errors gracefully"""
        customer_id = "CUST_001"
        
        # Mock database error
        mock_db.customers_v2.find_one.side_effect = Exception("DB Error")
        
        result = await engine.check_and_update_status(customer_id)
        
        assert result is None


# ============================================================================
# TEST 7: Integration Tests
# ============================================================================

class TestIntegration:
    """Test complete customer lifecycle"""
    
    @pytest.mark.asyncio
    async def test_complete_customer_lifecycle(self, engine, mock_db):
        """Test customer going through entire activation pipeline"""
        customer_id = "CUST_LIFECYCLE"
        order_id = "ORD_LIFECYCLE"
        
        # Step 1: Initialize customer (NEW status)
        mock_db.customers_v2.update_one.return_value = MagicMock(modified_count=1)
        result = await engine.initialize_customer_activation(customer_id, {})
        assert result is True
        
        # Step 2: First order (NEW → ONBOARDED)
        mock_db.customers_v2.find_one.return_value = {
            "id": customer_id,
            "activation_status": ActivationStatus.NEW
        }
        mock_db.customers_v2.update_one.return_value = MagicMock(modified_count=1)
        
        result = await engine.handle_first_order(customer_id, order_id, 500)
        assert result is True
        
        # Step 3: First delivery (ONBOARDED → ACTIVE)
        mock_db.customers_v2.find_one.return_value = {
            "id": customer_id,
            "activation_status": ActivationStatus.ONBOARDED,
            "first_delivery_date": None
        }
        mock_db.customers_v2.update_one.return_value = MagicMock(modified_count=1)
        
        result = await engine.handle_first_delivery(customer_id, order_id)
        assert result is True


if __name__ == "__main__":
    print("\n" + "="*70)
    print("PHASE 1.4: Activation Engine Test Suite")
    print("="*70 + "\n")
    print("Run tests with: pytest test_activation_engine.py -v\n")
    print("Test Coverage:")
    print("  - TestActivationInitialization (2 tests)")
    print("  - TestFirstOrder (2 tests)")
    print("  - TestFirstDelivery (2 tests)")
    print("  - TestStatusUpdates (3 tests)")
    print("  - TestActivationMetrics (2 tests)")
    print("  - TestErrorHandling (3 tests)")
    print("  - TestIntegration (1 test)")
    print("  - TOTAL: 15 comprehensive tests")
    print("="*70 + "\n")

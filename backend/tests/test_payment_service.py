"""
Payment Service Tests
Comprehensive test suite for payment gateway integration
Tests cover: Order creation, verification, refunds, webhooks, reconciliation
"""

import pytest
import json
import hmac
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from pymongo import MongoClient

from payment_service import (
    PaymentManager,
    PaymentOrder,
    PaymentStatus,
    PaymentMethod,
    Gateway,
    RefundRequest,
    RefundStatus,
    SavedPaymentMethod
)


# ==================== FIXTURES ====================

@pytest.fixture
def mock_db():
    """Mock MongoDB database"""
    db = Mock()
    db['payment_orders'] = Mock()
    db['saved_payment_methods'] = Mock()
    db['refunds'] = Mock()
    db['webhook_events'] = Mock()
    db['reconciliation_log'] = Mock()
    return db


@pytest.fixture
def payment_manager(mock_db):
    """Create PaymentManager instance with mocked database"""
    with patch('razorpay.Client'):
        manager = PaymentManager(db_client=None)
        manager.db = mock_db
        manager.payment_orders = mock_db['payment_orders']
        manager.saved_methods = mock_db['saved_payment_methods']
        manager.refunds = mock_db['refunds']
        manager.webhook_events = mock_db['webhook_events']
        manager.reconciliation_log = mock_db['reconciliation_log']
    return manager


@pytest.fixture
def sample_payment_order():
    """Sample payment order for testing"""
    return PaymentOrder(
        order_id="ORDER-001",
        customer_id="CUST-001",
        amount=Decimal("1000.00"),
        gateway=Gateway.RAZORPAY,
        method_type=PaymentMethod.CARD
    )


@pytest.fixture
def sample_refund():
    """Sample refund request"""
    return RefundRequest(
        payment_id="PAY-001",
        order_id="ORDER-001",
        customer_id="CUST-001",
        amount=Decimal("1000.00"),
        reason="customer_request"
    )


# ==================== PAYMENT ORDER TESTS ====================

class TestPaymentOrderCreation:
    """Tests for payment order creation"""

    @pytest.mark.asyncio
    async def test_create_payment_order_success(self, payment_manager, mock_db):
        """Test successful payment order creation"""
        # Mock database insert
        mock_result = Mock()
        mock_result.inserted_id = "6789abcdef"
        mock_db['payment_orders'].insert_one.return_value = mock_result
        
        # Mock Razorpay order creation
        payment_manager._create_razorpay_order = AsyncMock(return_value=(
            True, {
                "gateway_order_id": "order_1234",
                "amount": Decimal("1000.00"),
                "checkout_url": None
            }
        ))
        
        success, response = await payment_manager.create_payment_order(
            order_id="ORDER-001",
            customer_id="CUST-001",
            amount=Decimal("1000.00"),
            payment_method=PaymentMethod.CARD,
            gateway=Gateway.RAZORPAY
        )
        
        assert success is True
        assert response['amount'] == 1000.00
        assert response['gateway'] == Gateway.RAZORPAY
        assert 'payment_id' in response

    @pytest.mark.asyncio
    async def test_create_payment_order_invalid_amount(self, payment_manager):
        """Test payment order creation with invalid amount"""
        success, response = await payment_manager.create_payment_order(
            order_id="ORDER-001",
            customer_id="CUST-001",
            amount=Decimal("0"),
            payment_method=PaymentMethod.CARD
        )
        
        assert success is False
        assert "Invalid amount" in response['error']

    @pytest.mark.asyncio
    async def test_create_payment_order_gateway_failure(self, payment_manager, mock_db):
        """Test payment order creation when gateway fails"""
        mock_result = Mock()
        mock_result.inserted_id = "6789abcdef"
        mock_db['payment_orders'].insert_one.return_value = mock_result
        
        # Mock gateway failure
        payment_manager._create_razorpay_order = AsyncMock(return_value=(
            False, {"error": "Gateway connection failed"}
        ))
        
        success, response = await payment_manager.create_payment_order(
            order_id="ORDER-001",
            customer_id="CUST-001",
            amount=Decimal("1000.00"),
            payment_method=PaymentMethod.CARD
        )
        
        assert success is False
        assert "error" in response

    @pytest.mark.asyncio
    async def test_create_payment_with_installments(self, payment_manager, mock_db):
        """Test payment order creation with installments"""
        mock_result = Mock()
        mock_result.inserted_id = "6789abcdef"
        mock_db['payment_orders'].insert_one.return_value = mock_result
        
        payment_manager._create_razorpay_order = AsyncMock(return_value=(
            True, {"gateway_order_id": "order_1234", "amount": Decimal("1000.00")}
        ))
        
        success, response = await payment_manager.create_payment_order(
            order_id="ORDER-001",
            customer_id="CUST-001",
            amount=Decimal("3000.00"),
            payment_method=PaymentMethod.CARD,
            installments=3
        )
        
        assert success is True

    @pytest.mark.asyncio
    async def test_create_payment_with_saved_method(self, payment_manager, mock_db):
        """Test payment order with saved payment method"""
        mock_result = Mock()
        mock_result.inserted_id = "6789abcdef"
        mock_db['payment_orders'].insert_one.return_value = mock_result
        
        payment_manager._create_razorpay_order = AsyncMock(return_value=(
            True, {"gateway_order_id": "order_1234", "amount": Decimal("1000.00")}
        ))
        
        success, response = await payment_manager.create_payment_order(
            order_id="ORDER-001",
            customer_id="CUST-001",
            amount=Decimal("1000.00"),
            payment_method=PaymentMethod.CARD,
            saved_method_id="SAVED_METHOD_001"
        )
        
        assert success is True


# ==================== PAYMENT VERIFICATION TESTS ====================

class TestPaymentVerification:
    """Tests for payment verification"""

    @pytest.mark.asyncio
    async def test_verify_razorpay_payment_success(self, payment_manager, mock_db):
        """Test successful Razorpay payment verification"""
        # Mock payment order in database
        mock_payment = {
            '_id': 'PAY-001',
            'gateway': Gateway.RAZORPAY,
            'gateway_order_id': 'order_1234',
            'amount': 1000.00,
            'status': PaymentStatus.INITIATED
        }
        mock_db['payment_orders'].find_one.return_value = mock_payment
        
        # Mock Razorpay verification
        payment_manager._verify_razorpay_payment = AsyncMock(return_value=(
            True, {
                "gateway_payment_id": "pay_1234",
                "amount": Decimal("1000.00"),
                "status": "completed"
            }
        ))
        
        success, response = await payment_manager.verify_payment(
            payment_id='PAY-001',
            gateway_payment_id='pay_1234',
            signature='test_signature'
        )
        
        assert success is True
        assert response['status'] == 'completed'

    @pytest.mark.asyncio
    async def test_verify_payment_not_found(self, payment_manager, mock_db):
        """Test verification of non-existent payment"""
        mock_db['payment_orders'].find_one.return_value = None
        
        success, response = await payment_manager.verify_payment(
            payment_id='INVALID',
            gateway_payment_id='pay_1234',
            signature='test_signature'
        )
        
        assert success is False
        assert "Payment order not found" in response['error']

    @pytest.mark.asyncio
    async def test_verify_invalid_signature(self, payment_manager, mock_db):
        """Test payment verification with invalid signature"""
        mock_payment = {
            '_id': 'PAY-001',
            'gateway': Gateway.RAZORPAY,
            'gateway_order_id': 'order_1234'
        }
        mock_db['payment_orders'].find_one.return_value = mock_payment
        
        payment_manager._verify_razorpay_payment = AsyncMock(return_value=(
            False, {"error": "Invalid payment signature"}
        ))
        
        success, response = await payment_manager.verify_payment(
            payment_id='PAY-001',
            gateway_payment_id='pay_1234',
            signature='invalid_signature'
        )
        
        assert success is False


# ==================== REFUND TESTS ====================

class TestRefundProcessing:
    """Tests for refund processing"""

    @pytest.mark.asyncio
    async def test_create_full_refund(self, payment_manager, mock_db, sample_refund):
        """Test full refund creation"""
        mock_payment = {
            '_id': 'PAY-001',
            'gateway': Gateway.RAZORPAY,
            'gateway_payment_id': 'pay_1234',
            'amount': 1000.00,
            'status': PaymentStatus.COMPLETED,
            'order_id': 'ORDER-001',
            'customer_id': 'CUST-001'
        }
        mock_db['payment_orders'].find_one.return_value = mock_payment
        
        mock_refund_result = Mock()
        mock_refund_result.inserted_id = 'REFUND-001'
        mock_db['refunds'].insert_one.return_value = mock_refund_result
        
        payment_manager._refund_razorpay = AsyncMock(return_value=(
            True, {"gateway_refund_id": "rfnd_1234", "status": "completed"}
        ))
        
        success, response = await payment_manager.create_refund(
            payment_id='PAY-001',
            reason='customer_request'
        )
        
        assert success is True
        assert response['status'] == 'completed'

    @pytest.mark.asyncio
    async def test_create_partial_refund(self, payment_manager, mock_db):
        """Test partial refund creation"""
        mock_payment = {
            '_id': 'PAY-001',
            'gateway': Gateway.RAZORPAY,
            'gateway_payment_id': 'pay_1234',
            'amount': 1000.00,
            'status': PaymentStatus.COMPLETED,
            'order_id': 'ORDER-001',
            'customer_id': 'CUST-001'
        }
        mock_db['payment_orders'].find_one.return_value = mock_payment
        
        mock_refund_result = Mock()
        mock_refund_result.inserted_id = 'REFUND-001'
        mock_db['refunds'].insert_one.return_value = mock_refund_result
        
        payment_manager._refund_razorpay = AsyncMock(return_value=(
            True, {"gateway_refund_id": "rfnd_1234", "status": "completed"}
        ))
        
        success, response = await payment_manager.create_refund(
            payment_id='PAY-001',
            amount=Decimal("500.00"),
            reason='customer_request'
        )
        
        assert success is True

    @pytest.mark.asyncio
    async def test_refund_not_completed_payment(self, payment_manager, mock_db):
        """Test refund on non-completed payment"""
        mock_payment = {
            '_id': 'PAY-001',
            'status': PaymentStatus.PENDING,
            'amount': 1000.00
        }
        mock_db['payment_orders'].find_one.return_value = mock_payment
        
        success, response = await payment_manager.create_refund(
            payment_id='PAY-001'
        )
        
        assert success is False
        assert "Can only refund completed payments" in response['error']

    @pytest.mark.asyncio
    async def test_refund_exceeds_amount(self, payment_manager, mock_db):
        """Test refund exceeding payment amount"""
        mock_payment = {
            '_id': 'PAY-001',
            'status': PaymentStatus.COMPLETED,
            'amount': 1000.00
        }
        mock_db['payment_orders'].find_one.return_value = mock_payment
        
        success, response = await payment_manager.create_refund(
            payment_id='PAY-001',
            amount=Decimal("1500.00")
        )
        
        assert success is False
        assert "exceeds payment amount" in response['error']


# ==================== SAVED PAYMENT METHODS TESTS ====================

class TestSavedPaymentMethods:
    """Tests for saved payment methods"""

    @pytest.mark.asyncio
    async def test_save_card(self, payment_manager, mock_db):
        """Test saving card"""
        mock_result = Mock()
        mock_result.inserted_id = 'SAVED-001'
        mock_db['saved_payment_methods'].insert_one.return_value = mock_result
        
        success, response = await payment_manager.save_payment_method(
            customer_id='CUST-001',
            method_type=PaymentMethod.CARD,
            gateway=Gateway.RAZORPAY,
            token='token_1234',
            last4='4567',
            expiry='12/25',
            set_default=True
        )
        
        assert success is True
        assert response['last4'] == '4567'
        assert response['type'] == PaymentMethod.CARD

    @pytest.mark.asyncio
    async def test_save_upi(self, payment_manager, mock_db):
        """Test saving UPI"""
        mock_result = Mock()
        mock_result.inserted_id = 'SAVED-001'
        mock_db['saved_payment_methods'].insert_one.return_value = mock_result
        
        success, response = await payment_manager.save_payment_method(
            customer_id='CUST-001',
            method_type=PaymentMethod.UPI,
            gateway=Gateway.RAZORPAY,
            token='upi_token_1234',
            last4='6789@abc'
        )
        
        assert success is True

    @pytest.mark.asyncio
    async def test_get_saved_methods(self, payment_manager, mock_db):
        """Test retrieving saved methods"""
        mock_db['saved_payment_methods'].find.return_value = [
            {
                '_id': 'SAVED-001',
                'customer_id': 'CUST-001',
                'method_type': 'card',
                'last4': '4567',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
        ]
        
        methods = await payment_manager.get_saved_methods('CUST-001')
        
        assert len(methods) == 1
        assert methods[0]['last4'] == '4567'

    @pytest.mark.asyncio
    async def test_delete_saved_method(self, payment_manager, mock_db):
        """Test deleting saved method"""
        mock_result = Mock()
        mock_result.deleted_count = 1
        mock_db['saved_payment_methods'].delete_one.return_value = mock_result
        
        success, message = await payment_manager.delete_saved_method(
            method_id='SAVED-001',
            customer_id='CUST-001'
        )
        
        assert success is True


# ==================== WEBHOOK TESTS ====================

class TestWebhookProcessing:
    """Tests for webhook handling"""

    @pytest.mark.asyncio
    async def test_process_razorpay_webhook(self, payment_manager, mock_db):
        """Test processing Razorpay webhook"""
        mock_result = Mock()
        mock_result.inserted_id = 'WEBHOOK-001'
        mock_db['webhook_events'].insert_one.return_value = mock_result
        
        payment_manager._verify_webhook_signature = AsyncMock(return_value=True)
        payment_manager._process_razorpay_webhook = AsyncMock()
        
        payload = {
            'id': 'evt_1234',
            'event': 'payment.captured',
            'payload': {
                'payment': {'id': 'pay_1234'},
                'order': {'id': 'order_1234'}
            }
        }
        
        success, message = await payment_manager.process_webhook(
            gateway=Gateway.RAZORPAY,
            event_type='payment.captured',
            payload=payload,
            signature='test_signature'
        )
        
        assert success is True

    @pytest.mark.asyncio
    async def test_webhook_invalid_signature(self, payment_manager, mock_db):
        """Test webhook with invalid signature"""
        payment_manager._verify_webhook_signature = AsyncMock(return_value=False)
        
        payload = {'id': 'evt_1234', 'event': 'payment.captured'}
        
        success, message = await payment_manager.process_webhook(
            gateway=Gateway.RAZORPAY,
            event_type='payment.captured',
            payload=payload,
            signature='invalid_signature'
        )
        
        assert success is False


# ==================== RECONCILIATION TESTS ====================

class TestReconciliation:
    """Tests for payment reconciliation"""

    @pytest.mark.asyncio
    async def test_reconciliation_identifies_discrepancies(self, payment_manager, mock_db):
        """Test reconciliation identifies discrepancies"""
        # Mock pending payments
        mock_db['payment_orders'].find.return_value = [
            {
                '_id': 'PAY-001',
                'gateway': Gateway.RAZORPAY,
                'gateway_order_id': 'order_1234',
                'status': PaymentStatus.PENDING,
                'created_at': datetime.utcnow() - timedelta(minutes=10)
            }
        ]
        
        payment_manager._reconcile_razorpay = AsyncMock(return_value=[
            {
                'type': 'recovered',
                'payment_id': 'PAY-001',
                'message': 'Payment recovered from Razorpay'
            }
        ])
        
        payment_manager._reconcile_paypal = AsyncMock(return_value=[])
        
        report = await payment_manager.reconcile_payments()
        
        assert 'discrepancies_found' in report
        assert report['razorpay_checked'] >= 0


# ==================== INTEGRATION TESTS ====================

class TestPaymentIntegration:
    """Integration tests for complete payment flows"""

    @pytest.mark.asyncio
    async def test_complete_payment_flow(self, payment_manager, mock_db):
        """Test complete payment flow: create -> verify -> success"""
        # Step 1: Create payment order
        mock_result = Mock()
        mock_result.inserted_id = 'PAY-001'
        mock_db['payment_orders'].insert_one.return_value = mock_result
        
        payment_manager._create_razorpay_order = AsyncMock(return_value=(
            True, {"gateway_order_id": "order_1234", "amount": Decimal("1000.00")}
        ))
        
        create_success, create_response = await payment_manager.create_payment_order(
            order_id="ORDER-001",
            customer_id="CUST-001",
            amount=Decimal("1000.00"),
            payment_method=PaymentMethod.CARD
        )
        
        assert create_success is True
        
        # Step 2: Verify payment
        mock_payment = {
            '_id': 'PAY-001',
            'gateway': Gateway.RAZORPAY,
            'amount': 1000.00,
            'status': PaymentStatus.INITIATED
        }
        mock_db['payment_orders'].find_one.return_value = mock_payment
        
        payment_manager._verify_razorpay_payment = AsyncMock(return_value=(
            True, {
                "gateway_payment_id": "pay_1234",
                "amount": Decimal("1000.00"),
                "status": "completed"
            }
        ))
        
        verify_success, verify_response = await payment_manager.verify_payment(
            payment_id='PAY-001',
            gateway_payment_id='pay_1234',
            signature='test_signature'
        )
        
        assert verify_success is True

    @pytest.mark.asyncio
    async def test_payment_with_refund_flow(self, payment_manager, mock_db):
        """Test payment creation and subsequent refund"""
        # Create payment
        mock_result = Mock()
        mock_result.inserted_id = 'PAY-001'
        mock_db['payment_orders'].insert_one.return_value = mock_result
        
        payment_manager._create_razorpay_order = AsyncMock(return_value=(
            True, {"gateway_order_id": "order_1234", "amount": Decimal("1000.00")}
        ))
        
        create_success, _ = await payment_manager.create_payment_order(
            order_id="ORDER-001",
            customer_id="CUST-001",
            amount=Decimal("1000.00"),
            payment_method=PaymentMethod.CARD
        )
        
        assert create_success is True
        
        # Process refund
        mock_payment = {
            '_id': 'PAY-001',
            'gateway': Gateway.RAZORPAY,
            'gateway_payment_id': 'pay_1234',
            'amount': 1000.00,
            'status': PaymentStatus.COMPLETED,
            'order_id': 'ORDER-001',
            'customer_id': 'CUST-001'
        }
        mock_db['payment_orders'].find_one.return_value = mock_payment
        
        mock_refund_result = Mock()
        mock_refund_result.inserted_id = 'REFUND-001'
        mock_db['refunds'].insert_one.return_value = mock_refund_result
        
        payment_manager._refund_razorpay = AsyncMock(return_value=(
            True, {"gateway_refund_id": "rfnd_1234", "status": "completed"}
        ))
        
        refund_success, _ = await payment_manager.create_refund(
            payment_id='PAY-001'
        )
        
        assert refund_success is True


# ==================== ERROR HANDLING TESTS ====================

class TestErrorHandling:
    """Tests for error handling and edge cases"""

    @pytest.mark.asyncio
    async def test_payment_with_network_error(self, payment_manager, mock_db):
        """Test payment creation when network error occurs"""
        mock_result = Mock()
        mock_result.inserted_id = 'PAY-001'
        mock_db['payment_orders'].insert_one.return_value = mock_result
        
        payment_manager._create_razorpay_order = AsyncMock(
            side_effect=Exception("Network timeout")
        )
        
        success, response = await payment_manager.create_payment_order(
            order_id="ORDER-001",
            customer_id="CUST-001",
            amount=Decimal("1000.00"),
            payment_method=PaymentMethod.CARD
        )
        
        assert success is False
        assert "error" in response

    @pytest.mark.asyncio
    async def test_duplicate_payment_order(self, payment_manager, mock_db):
        """Test creating duplicate payment for same order"""
        from pymongo.errors import DuplicateKeyError
        
        mock_db['payment_orders'].insert_one.side_effect = DuplicateKeyError("duplicate")
        
        success, response = await payment_manager.create_payment_order(
            order_id="ORDER-001",
            customer_id="CUST-001",
            amount=Decimal("1000.00"),
            payment_method=PaymentMethod.CARD
        )
        
        assert success is False


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])

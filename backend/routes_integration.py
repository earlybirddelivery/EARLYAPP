# Routes for Wallet & Payment Gateway Integration
# Endpoints for wallet top-ups, wallet payments, and refunds

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from datetime import datetime
import logging
from functools import wraps

from backend.wallet_payment_integration import WalletPaymentIntegration, handle_razorpay_webhook
from backend.wallet_service import WalletService
from backend.payment_service import PaymentService

logger = logging.getLogger(__name__)

# Blueprint
integration_bp = Blueprint('integration', __name__, url_prefix='/api/integration')


# ========== AUTH DECORATORS ==========

def require_auth(f):
    """Require JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({"error": "Missing authorization token"}), 401
        # TODO: Validate token
        return f(*args, **kwargs)
    return decorated_function


# ========== WALLET TOPUP ENDPOINTS ==========

@integration_bp.route('/wallet/topup/initiate', methods=['POST'])
@cross_origin()
@require_auth
def initiate_wallet_topup():
    """
    Initiate wallet top-up payment
    
    POST /api/integration/wallet/topup/initiate
    
    Body: {
        "customer_id": "customer_123",
        "amount": 500.00,
        "payment_method": "razorpay"  // razorpay, paypal, google_pay, apple_pay, upi
    }
    
    Response: {
        "success": true,
        "payment_order_id": "order_123",
        "amount": 500.00,
        "gateway": "razorpay",
        "redirect_url": "https://checkout.razorpay.com/...",
        "key_id": "rzp_live_..."
    }
    """
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        amount = data.get('amount')
        payment_method = data.get('payment_method', 'razorpay')
        
        # Validation
        if not customer_id or not amount:
            return jsonify({"error": "Missing customer_id or amount"}), 400
        
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than 0"}), 400
        
        # Get integration service
        integration = _get_integration_service(request.app)
        
        # Initiate payment
        result = integration.initiate_wallet_topup_payment(
            customer_id=customer_id,
            amount=amount,
            payment_method=payment_method
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    
    except Exception as e:
        logger.error(f"Error initiating wallet topup: {str(e)}")
        return jsonify({"error": str(e)}), 500


@integration_bp.route('/wallet/topup/verify', methods=['POST'])
@cross_origin()
@require_auth
def verify_wallet_topup():
    """
    Verify wallet top-up payment after redirect
    
    POST /api/integration/wallet/topup/verify
    
    Body: {
        "payment_id": "razorpay_payment_id",
        "order_id": "razorpay_order_id",
        "signature": "razorpay_signature"
    }
    
    Response: {
        "success": true,
        "message": "Credits added to wallet",
        "wallet_balance": 2500.00
    }
    """
    try:
        data = request.get_json()
        payment_id = data.get('payment_id')
        order_id = data.get('order_id')
        signature = data.get('signature')
        
        if not all([payment_id, order_id, signature]):
            return jsonify({"error": "Missing payment verification data"}), 400
        
        # TODO: Verify signature matches payment gateway
        
        # Get integration service
        integration = _get_integration_service(request.app)
        
        # Get payment details from payment service
        payment_service = integration.payment_service
        payment = payment_service.get_payment(payment_id)
        
        if not payment:
            return jsonify({"error": "Payment not found"}), 404
        
        # Process webhook
        webhook_data = {
            "payment_id": payment_id,
            "order_id": order_id,
            "amount": payment.get('amount'),
            "status": "SUCCESS" if payment.get('status') == 'PAID' else "FAILED",
            "gateway": payment.get('gateway'),
            "customer_id": payment.get('customer_id'),
            "user_id": payment.get('user_id'),
            "metadata": payment.get('metadata', {}),
            "signature": signature
        }
        
        result = integration.process_payment_webhook(webhook_data)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    
    except Exception as e:
        logger.error(f"Error verifying wallet topup: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========== WEBHOOK ENDPOINTS ==========

@integration_bp.route('/webhook/razorpay', methods=['POST'])
@cross_origin()
def webhook_razorpay():
    """
    Razorpay webhook callback
    
    Called by Razorpay when payment is completed
    
    POST /api/integration/webhook/razorpay
    """
    try:
        webhook_data = request.get_json()
        
        logger.info(f"Received Razorpay webhook: {webhook_data.get('event')}")
        
        # Get integration service
        integration = _get_integration_service(request.app)
        
        # Handle webhook
        result = handle_razorpay_webhook(webhook_data, integration)
        
        # Always return 200 to acknowledge receipt
        return jsonify({"success": True, "message": "Webhook processed"}), 200
    
    except Exception as e:
        logger.error(f"Error processing Razorpay webhook: {str(e)}")
        return jsonify({"error": str(e)}), 200  # Still return 200


@integration_bp.route('/webhook/paypal', methods=['POST'])
@cross_origin()
def webhook_paypal():
    """
    PayPal webhook callback
    
    Called by PayPal when payment is completed
    
    POST /api/integration/webhook/paypal
    """
    try:
        webhook_data = request.get_json()
        
        logger.info(f"Received PayPal webhook: {webhook_data.get('event_type')}")
        
        # Get integration service
        integration = _get_integration_service(request.app)
        
        # TODO: Implement PayPal webhook handling
        
        return jsonify({"success": True, "message": "Webhook processed"}), 200
    
    except Exception as e:
        logger.error(f"Error processing PayPal webhook: {str(e)}")
        return jsonify({"error": str(e)}), 200


@integration_bp.route('/webhook/google-pay', methods=['POST'])
@cross_origin()
def webhook_google_pay():
    """
    Google Pay webhook callback
    
    Called by Google when payment is completed
    
    POST /api/integration/webhook/google-pay
    """
    try:
        webhook_data = request.get_json()
        
        logger.info("Received Google Pay webhook")
        
        # Get integration service
        integration = _get_integration_service(request.app)
        
        # TODO: Implement Google Pay webhook handling
        
        return jsonify({"success": True, "message": "Webhook processed"}), 200
    
    except Exception as e:
        logger.error(f"Error processing Google Pay webhook: {str(e)}")
        return jsonify({"error": str(e)}), 200


# ========== ORDER PAYMENT WITH WALLET ==========

@integration_bp.route('/order/pay-with-wallet', methods=['POST'])
@cross_origin()
@require_auth
def pay_order_with_wallet():
    """
    Pay for order using wallet credits
    
    POST /api/integration/order/pay-with-wallet
    
    Body: {
        "order_id": "order_123",
        "customer_id": "customer_123",
        "amount": 500.00
    }
    
    Response: {
        "success": true,
        "transaction_id": "tx_123",
        "order_id": "order_123",
        "remaining_balance": 2000.00
    }
    """
    try:
        data = request.get_json()
        order_id = data.get('order_id')
        customer_id = data.get('customer_id')
        amount = data.get('amount')
        
        if not all([order_id, customer_id, amount]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Get integration service
        integration = _get_integration_service(request.app)
        
        # Link payment to order
        result = integration.link_payment_to_order(
            order_id=order_id,
            customer_id=customer_id,
            amount=amount
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    
    except Exception as e:
        logger.error(f"Error paying order with wallet: {str(e)}")
        return jsonify({"error": str(e)}), 500


@integration_bp.route('/order/refund-to-wallet', methods=['POST'])
@cross_origin()
@require_auth
def refund_order_to_wallet():
    """
    Refund order amount back to wallet
    
    POST /api/integration/order/refund-to-wallet
    
    Body: {
        "order_id": "order_123",
        "customer_id": "customer_123",
        "amount": 500.00,
        "reason": "Order cancelled by customer"
    }
    
    Response: {
        "success": true,
        "transaction_id": "tx_123",
        "refund_amount": 500.00,
        "new_balance": 2500.00
    }
    """
    try:
        data = request.get_json()
        order_id = data.get('order_id')
        customer_id = data.get('customer_id')
        amount = data.get('amount')
        reason = data.get('reason', 'Order refund')
        
        if not all([order_id, customer_id, amount]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Get integration service
        integration = _get_integration_service(request.app)
        
        # Process refund
        result = integration.process_refund_to_wallet(
            order_id=order_id,
            customer_id=customer_id,
            amount=amount,
            reason=reason
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    
    except Exception as e:
        logger.error(f"Error refunding to wallet: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========== STATUS & INFO ENDPOINTS ==========

@integration_bp.route('/status/<customer_id>', methods=['GET'])
@cross_origin()
@require_auth
def get_integration_status(customer_id):
    """
    Get wallet-payment integration status for customer
    
    GET /api/integration/status/{customer_id}
    
    Response: {
        "wallet": {
            "balance": 2500.00,
            "tier": "GOLD",
            "status": "ACTIVE"
        },
        "statistics": {
            "total_spent": 5000.00,
            "total_refunded": 500.00
        },
        "recent_transactions": [...]
    }
    """
    try:
        # Get integration service
        integration = _get_integration_service(request.app)
        
        # Get status
        result = integration.get_integration_status(customer_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    
    except Exception as e:
        logger.error(f"Error getting integration status: {str(e)}")
        return jsonify({"error": str(e)}), 500


@integration_bp.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """
    Health check for integration service
    
    GET /api/integration/health
    """
    try:
        integration = _get_integration_service(request.app)
        
        return jsonify({
            "status": "healthy",
            "service": "wallet_payment_integration",
            "timestamp": datetime.utcnow().isoformat(),
            "features": [
                "wallet_topup",
                "wallet_payment",
                "wallet_refund",
                "payment_webhooks"
            ]
        }), 200
    
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500


# ========== HELPER FUNCTIONS ==========

def _get_integration_service(app) -> WalletPaymentIntegration:
    """
    Get or create integration service instance
    """
    if not hasattr(app, 'integration_service'):
        from pymongo import MongoClient
        
        db = MongoClient(app.config.get('MONGO_URI')).get_default_database()
        wallet_service = WalletService(db)
        payment_service = PaymentService(db)
        
        app.integration_service = WalletPaymentIntegration(
            wallet_service=wallet_service,
            payment_service=payment_service,
            db=db
        )
    
    return app.integration_service


# ========== ERROR HANDLERS ==========

@integration_bp.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({"error": "Endpoint not found"}), 404


@integration_bp.errorhandler(500)
def server_error(error):
    """Handle 500 errors"""
    logger.error(f"Server error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500

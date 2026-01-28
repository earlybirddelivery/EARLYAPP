"""
Customer Wallet REST API Routes - PHASE 4B.3
Endpoints for wallet operations, transactions, loyalty rewards, and credit management.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from functools import wraps
from wallet_service import WalletService
import logging

logger = logging.getLogger(__name__)

# Create blueprint
wallet_bp = Blueprint("wallet", __name__, url_prefix="/api/wallet")


def require_auth(f):
    """Decorator to verify authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Missing authorization"}), 401
        # Token validation would go here
        return f(*args, **kwargs)
    return decorated_function


def require_role(required_role):
    """Decorator to verify user role."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_role = request.headers.get("X-User-Role", "customer")
            if user_role != required_role and required_role not in ["customer", "admin"]:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def init_wallet_routes(app, db):
    """Initialize wallet routes with database connection."""
    wallet_service = WalletService(db)
    
    # ===== WALLET OPERATIONS =====
    
    @wallet_bp.route("/create", methods=["POST"])
    @require_auth
    def create_wallet():
        """
        Create new customer wallet.
        
        POST /api/wallet/create
        Body: {
            "customer_id": "cust_123",
            "initial_balance": 1000.0  // Optional
        }
        
        Returns: 201 Created
        """
        try:
            data = request.get_json()
            customer_id = data.get("customer_id")
            initial_balance = float(data.get("initial_balance", 0))
            
            if not customer_id:
                return jsonify({"error": "customer_id required"}), 400
            
            wallet = wallet_service.create_wallet(customer_id, initial_balance)
            return jsonify(wallet), 201
            
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Error creating wallet: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    @wallet_bp.route("/<customer_id>", methods=["GET"])
    @require_auth
    def get_wallet(customer_id):
        """
        Get customer wallet details.
        
        GET /api/wallet/{customer_id}
        
        Returns:
        {
            "customer_id": "cust_123",
            "balance": 2500.50,
            "total_earned": 5000,
            "total_spent": 2000,
            "tier": "GOLD",
            "status": "ACTIVE",
            ...
        }
        """
        try:
            wallet = wallet_service.get_wallet(customer_id)
            
            if not wallet:
                return jsonify({"error": "Wallet not found"}), 404
            
            return jsonify(wallet), 200
            
        except Exception as e:
            logger.error(f"Error fetching wallet: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    @wallet_bp.route("/<customer_id>/balance", methods=["GET"])
    @require_auth
    def get_balance(customer_id):
        """
        Get only wallet balance (lightweight).
        
        GET /api/wallet/{customer_id}/balance
        
        Returns: { "balance": 2500.50 }
        """
        try:
            balance = wallet_service.get_wallet_balance(customer_id)
            return jsonify({"balance": balance}), 200
            
        except Exception as e:
            logger.error(f"Error fetching balance: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    # ===== CREDIT OPERATIONS =====
    
    @wallet_bp.route("/<customer_id>/add-credits", methods=["POST"])
    @require_auth
    @require_role("admin")
    def add_credits(customer_id):
        """
        Add credits to wallet.
        
        POST /api/wallet/{customer_id}/add-credits
        Body: {
            "amount": 500.0,
            "reason": "Purchase reward",
            "source": "purchase|referral|promotion|refund|loyalty|manual",
            "expiry_days": 365,  // Optional
            "metadata": {...}    // Optional
        }
        
        Returns: 201 Created
        """
        try:
            data = request.get_json()
            amount = float(data.get("amount", 0))
            reason = data.get("reason", "")
            source = data.get("source", "manual")
            expiry_days = data.get("expiry_days")
            metadata = data.get("metadata")
            
            if not amount or amount <= 0:
                return jsonify({"error": "Valid amount required"}), 400
            if not reason:
                return jsonify({"error": "Reason required"}), 400
            
            transaction = wallet_service.add_credits(
                customer_id=customer_id,
                amount=amount,
                reason=reason,
                source=source,
                expiry_days=expiry_days,
                metadata=metadata
            )
            
            return jsonify(transaction), 201
            
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Error adding credits: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    @wallet_bp.route("/<customer_id>/deduct-credits", methods=["POST"])
    @require_auth
    def deduct_credits(customer_id):
        """
        Deduct credits from wallet (for purchases, etc).
        
        POST /api/wallet/{customer_id}/deduct-credits
        Body: {
            "amount": 250.0,
            "reason": "Order payment",
            "order_id": "order_789",
            "metadata": {...}  // Optional
        }
        
        Returns: 200 OK or 400 Bad Request (insufficient balance)
        """
        try:
            data = request.get_json()
            amount = float(data.get("amount", 0))
            reason = data.get("reason", "")
            order_id = data.get("order_id")
            metadata = data.get("metadata")
            
            if not amount or amount <= 0:
                return jsonify({"error": "Valid amount required"}), 400
            if not reason:
                return jsonify({"error": "Reason required"}), 400
            
            transaction = wallet_service.deduct_credits(
                customer_id=customer_id,
                amount=amount,
                reason=reason,
                order_id=order_id,
                metadata=metadata
            )
            
            return jsonify(transaction), 200
            
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Error deducting credits: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    @wallet_bp.route("/<customer_id>/refund", methods=["POST"])
    @require_auth
    @require_role("admin")
    def refund_order(customer_id):
        """
        Refund credits for cancelled order.
        
        POST /api/wallet/{customer_id}/refund
        Body: {
            "amount": 500.0,
            "order_id": "order_456",
            "reason": "Order cancelled by customer"  // Optional
        }
        
        Returns: 200 OK
        """
        try:
            data = request.get_json()
            amount = float(data.get("amount", 0))
            order_id = data.get("order_id")
            reason = data.get("reason", "Order refund")
            
            if not amount or amount <= 0:
                return jsonify({"error": "Valid amount required"}), 400
            if not order_id:
                return jsonify({"error": "order_id required"}), 400
            
            transaction = wallet_service.refund_credits(
                customer_id=customer_id,
                amount=amount,
                order_id=order_id,
                reason=reason
            )
            
            return jsonify(transaction), 200
            
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Error processing refund: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    # ===== TRANSACTION HISTORY =====
    
    @wallet_bp.route("/<customer_id>/transactions", methods=["GET"])
    @require_auth
    def get_transactions(customer_id):
        """
        Get transaction history.
        
        GET /api/wallet/{customer_id}/transactions
        Query params:
        - limit: 50 (default)
        - skip: 0 (default)
        - type: CREDIT|DEBIT|REFUND (optional filter)
        - start_date: ISO datetime (optional)
        - end_date: ISO datetime (optional)
        
        Returns:
        {
            "transactions": [...],
            "total": 150,
            "limit": 50,
            "skip": 0
        }
        """
        try:
            limit = int(request.args.get("limit", 50))
            skip = int(request.args.get("skip", 0))
            tx_type = request.args.get("type")
            start_date = request.args.get("start_date")
            end_date = request.args.get("end_date")
            
            # Parse dates if provided
            start_dt = datetime.fromisoformat(start_date) if start_date else None
            end_dt = datetime.fromisoformat(end_date) if end_date else None
            
            transactions, total = wallet_service.get_transaction_history(
                customer_id=customer_id,
                limit=limit,
                skip=skip,
                transaction_type=tx_type,
                start_date=start_dt,
                end_date=end_dt
            )
            
            return jsonify({
                "transactions": transactions,
                "total": total,
                "limit": limit,
                "skip": skip
            }), 200
            
        except Exception as e:
            logger.error(f"Error fetching transactions: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    @wallet_bp.route("/<customer_id>/transaction-summary", methods=["GET"])
    @require_auth
    def get_tx_summary(customer_id):
        """
        Get transaction summary statistics.
        
        GET /api/wallet/{customer_id}/transaction-summary
        
        Returns:
        {
            "credit_total": 5000,
            "credit_count": 15,
            "debit_total": 2000,
            "debit_count": 8,
            "refund_total": 500,
            "refund_count": 2
        }
        """
        try:
            summary = wallet_service.get_transaction_summary(customer_id)
            return jsonify(summary), 200
            
        except Exception as e:
            logger.error(f"Error fetching summary: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    # ===== LOYALTY REWARDS =====
    
    @wallet_bp.route("/rewards/create", methods=["POST"])
    @require_auth
    @require_role("admin")
    def create_reward():
        """
        Create loyalty reward program.
        
        POST /api/wallet/rewards/create
        Body: {
            "name": "Birthday Bonus",
            "description": "Extra credits on birthday",
            "credit_amount": 500.0,
            "min_purchase_amount": 0,
            "max_uses": 1000,
            "valid_from": "2026-02-01T00:00:00",
            "valid_until": "2026-12-31T23:59:59",
            "applicable_to": ["category_1", "product_2"]  // Optional
        }
        
        Returns: 201 Created
        """
        try:
            data = request.get_json()
            
            valid_from = None
            valid_until = None
            if data.get("valid_from"):
                valid_from = datetime.fromisoformat(data["valid_from"])
            if data.get("valid_until"):
                valid_until = datetime.fromisoformat(data["valid_until"])
            
            reward = wallet_service.create_loyalty_reward(
                name=data.get("name"),
                description=data.get("description"),
                credit_amount=float(data.get("credit_amount", 0)),
                min_purchase_amount=float(data.get("min_purchase_amount", 0)),
                max_uses=data.get("max_uses"),
                valid_from=valid_from,
                valid_until=valid_until,
                applicable_to=data.get("applicable_to")
            )
            
            return jsonify(reward), 201
            
        except Exception as e:
            logger.error(f"Error creating reward: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    @wallet_bp.route("/<customer_id>/rewards/available", methods=["GET"])
    @require_auth
    def get_available_rewards(customer_id):
        """
        Get available rewards for customer.
        
        GET /api/wallet/{customer_id}/rewards/available
        
        Returns: { "rewards": [...] }
        """
        try:
            rewards = wallet_service.get_available_rewards(customer_id)
            return jsonify({"rewards": rewards}), 200
            
        except Exception as e:
            logger.error(f"Error fetching rewards: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    @wallet_bp.route("/<customer_id>/rewards/apply", methods=["POST"])
    @require_auth
    def apply_reward(customer_id):
        """
        Apply loyalty reward.
        
        POST /api/wallet/{customer_id}/rewards/apply
        Body: {
            "reward_id": "reward_123",
            "order_id": "order_789"  // Optional
        }
        
        Returns: 200 OK
        """
        try:
            data = request.get_json()
            reward_id = data.get("reward_id")
            order_id = data.get("order_id")
            
            if not reward_id:
                return jsonify({"error": "reward_id required"}), 400
            
            transaction = wallet_service.apply_loyalty_reward(
                customer_id=customer_id,
                reward_id=reward_id,
                order_id=order_id
            )
            
            return jsonify(transaction), 200
            
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Error applying reward: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    # ===== CREDIT EXPIRY =====
    
    @wallet_bp.route("/<customer_id>/expiring", methods=["GET"])
    @require_auth
    def get_expiring_credits(customer_id):
        """
        Get credits expiring soon.
        
        GET /api/wallet/{customer_id}/expiring
        Query params:
        - days_ahead: 30 (default)
        
        Returns: { "expiring": [...] }
        """
        try:
            days_ahead = int(request.args.get("days_ahead", 30))
            
            expiring = wallet_service.get_expiring_credits(
                customer_id=customer_id,
                days_ahead=days_ahead
            )
            
            return jsonify({"expiring": expiring}), 200
            
        except Exception as e:
            logger.error(f"Error fetching expiring credits: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    @wallet_bp.route("/<customer_id>/expiry-history", methods=["GET"])
    @require_auth
    def get_expiry_history(customer_id):
        """
        Get credit expiry history.
        
        GET /api/wallet/{customer_id}/expiry-history
        
        Returns: { "history": [...] }
        """
        try:
            history = wallet_service.get_expiry_history(customer_id)
            return jsonify({"history": history}), 200
            
        except Exception as e:
            logger.error(f"Error fetching expiry history: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    # ===== REFERRAL SYSTEM =====
    
    @wallet_bp.route("/<customer_id>/referral-code", methods=["GET"])
    @require_auth
    def get_referral_code(customer_id):
        """
        Get customer's referral code.
        
        GET /api/wallet/{customer_id}/referral-code
        
        Returns: { "referral_code": "REFCUST12345678" }
        """
        try:
            code = wallet_service.get_referral_code(customer_id)
            
            if not code:
                return jsonify({"error": "Referral code not found"}), 404
            
            return jsonify({"referral_code": code}), 200
            
        except Exception as e:
            logger.error(f"Error fetching referral code: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    @wallet_bp.route("/referral/apply", methods=["POST"])
    @require_auth
    @require_role("admin")
    def apply_referral():
        """
        Apply referral bonus.
        
        POST /api/wallet/referral/apply
        Body: {
            "referrer_id": "cust_123",
            "referred_id": "cust_456",
            "bonus_amount": 100.0  // Optional, default 100
        }
        
        Returns: { "referrer_transaction": {...}, "referred_transaction": {...} }
        """
        try:
            data = request.get_json()
            referrer_id = data.get("referrer_id")
            referred_id = data.get("referred_id")
            bonus = float(data.get("bonus_amount", 100.0))
            
            if not referrer_id or not referred_id:
                return jsonify({"error": "referrer_id and referred_id required"}), 400
            
            ref_tx, referred_tx = wallet_service.apply_referral_bonus(
                referrer_id=referrer_id,
                referred_id=referred_id,
                bonus_amount=bonus
            )
            
            return jsonify({
                "referrer_transaction": ref_tx,
                "referred_transaction": referred_tx
            }), 200
            
        except Exception as e:
            logger.error(f"Error applying referral: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    # ===== TIER & BENEFITS =====
    
    @wallet_bp.route("/<customer_id>/tier-benefits", methods=["GET"])
    @require_auth
    def get_tier_benefits(customer_id):
        """
        Get tier benefits for customer.
        
        GET /api/wallet/{customer_id}/tier-benefits
        
        Returns:
        {
            "tier": "GOLD",
            "benefits": {
                "min_balance": 5000,
                "credit_expiry_days": 1095,
                "bonus_multiplier": 1.10,
                "exclusive_rewards": [...]
            }
        }
        """
        try:
            wallet = wallet_service.get_wallet(customer_id)
            
            if not wallet:
                return jsonify({"error": "Wallet not found"}), 404
            
            tier = wallet["tier"]
            benefits = wallet_service.get_tier_benefits(tier)
            
            return jsonify({
                "tier": tier,
                "benefits": benefits
            }), 200
            
        except Exception as e:
            logger.error(f"Error fetching tier benefits: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    # ===== STATISTICS & ANALYTICS =====
    
    @wallet_bp.route("/<customer_id>/statistics", methods=["GET"])
    @require_auth
    def get_statistics(customer_id):
        """
        Get comprehensive wallet statistics.
        
        GET /api/wallet/{customer_id}/statistics
        
        Returns:
        {
            "customer_id": "cust_123",
            "current_balance": 2500.50,
            "total_earned": 5000,
            "total_spent": 2000,
            "tier": "GOLD",
            "transactions": {...},
            "expiring_soon": 2,
            ...
        }
        """
        try:
            stats = wallet_service.get_wallet_statistics(customer_id)
            
            if not stats:
                return jsonify({"error": "Wallet not found"}), 404
            
            return jsonify(stats), 200
            
        except Exception as e:
            logger.error(f"Error fetching statistics: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    # ===== BULK OPERATIONS =====
    
    @wallet_bp.route("/bulk/add-credits", methods=["POST"])
    @require_auth
    @require_role("admin")
    def bulk_add_credits():
        """
        Add credits to multiple customers.
        
        POST /api/wallet/bulk/add-credits
        Body: {
            "credits": [
                {
                    "customer_id": "cust_123",
                    "amount": 500,
                    "reason": "Campaign bonus",
                    "source": "promotion"
                },
                ...
            ]
        }
        
        Returns: { "results": [...] }
        """
        try:
            data = request.get_json()
            credits = data.get("credits", [])
            
            if not credits:
                return jsonify({"error": "credits array required"}), 400
            
            results = wallet_service.bulk_add_credits(credits)
            
            return jsonify({"results": results}), 200
            
        except Exception as e:
            logger.error(f"Error in bulk operation: {e}")
            return jsonify({"error": "Internal server error"}), 500
    
    # Register blueprint with app
    app.register_blueprint(wallet_bp)
    
    return wallet_bp

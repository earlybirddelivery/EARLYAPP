# Wallet & Payment Gateway Integration
# Handles callbacks from payment gateway and adds credits to customer wallet

from datetime import datetime, timedelta
from typing import Dict, Optional
import logging
from backend.wallet_service import WalletService
from backend.payment_service import PaymentService

logger = logging.getLogger(__name__)


class WalletPaymentIntegration:
    """
    Integration layer between Payment Gateway and Customer Wallet
    
    Flow:
    1. Customer initiates "Add Credits" payment
    2. Payment gateway processes payment
    3. Webhook callback received
    4. This service adds credits to wallet
    5. WhatsApp confirmation sent
    """
    
    def __init__(self, wallet_service: WalletService, payment_service: PaymentService, db):
        """
        Initialize integration service
        
        Args:
            wallet_service: WalletService instance for wallet operations
            payment_service: PaymentService instance for payment operations
            db: MongoDB database connection
        """
        self.wallet_service = wallet_service
        self.payment_service = payment_service
        self.db = db
    
    # ========== MAIN INTEGRATION METHODS ==========
    
    def process_payment_webhook(self, webhook_data: Dict) -> Dict:
        """
        Process payment webhook callback from payment gateway
        
        Called when payment completes (Razorpay, PayPal, etc.)
        
        Args:
            webhook_data: {
                "payment_id": "razorpay_payment_id",
                "order_id": "order_id_from_gateway",
                "amount": 500.00,
                "status": "SUCCESS|FAILED|PENDING",
                "gateway": "razorpay|paypal|google_pay|apple_pay|upi",
                "customer_id": "customer_id",
                "user_id": "user_id",
                "metadata": {
                    "add_credits": true,
                    "amount": 500.00,
                    "expiry_days": 365
                }
            }
        
        Returns:
            {
                "success": true,
                "message": "Credits added to wallet",
                "wallet_id": "wallet_123",
                "transaction_id": "tx_123",
                "balance": 2500.00
            }
        """
        try:
            payment_id = webhook_data.get("payment_id")
            customer_id = webhook_data.get("customer_id")
            amount = webhook_data.get("amount")
            status = webhook_data.get("status")
            gateway = webhook_data.get("gateway")
            metadata = webhook_data.get("metadata", {})
            
            logger.info(f"Processing webhook for payment {payment_id}, customer {customer_id}")
            
            # Verify webhook signature is valid
            if not self._verify_webhook_signature(webhook_data):
                logger.error(f"Invalid webhook signature for payment {payment_id}")
                return {
                    "success": False,
                    "error": "Invalid webhook signature"
                }
            
            # Check if payment was successful
            if status != "SUCCESS":
                logger.info(f"Payment {payment_id} status: {status}, skipping wallet credit")
                return {
                    "success": False,
                    "error": f"Payment status is {status}, not SUCCESS"
                }
            
            # Check if this is an "add credits" payment
            if not metadata.get("add_credits"):
                logger.info(f"Payment {payment_id} is not for adding credits, skipping")
                return {
                    "success": False,
                    "error": "Payment is not for adding credits"
                }
            
            # Get credit amount and expiry
            credit_amount = metadata.get("amount", amount)
            expiry_days = metadata.get("expiry_days", 365)
            
            # Add credits to wallet
            transaction = self.wallet_service.add_credits(
                customer_id=customer_id,
                amount=credit_amount,
                reason=f"Payment via {gateway}",
                source="purchase",
                expiry_days=expiry_days,
                metadata={
                    "payment_id": payment_id,
                    "gateway": gateway,
                    "webhook_timestamp": datetime.utcnow().isoformat()
                }
            )
            
            # Get updated wallet
            wallet = self.wallet_service.get_wallet(customer_id)
            
            # Log integration transaction
            self._log_integration_transaction(
                customer_id=customer_id,
                payment_id=payment_id,
                transaction_id=transaction['_id'],
                amount=credit_amount,
                gateway=gateway,
                status="SUCCESS"
            )
            
            # Send WhatsApp confirmation (optional)
            self._send_wallet_confirmation(
                customer_id=customer_id,
                amount=credit_amount,
                wallet_balance=wallet['balance'],
                transaction_id=str(transaction['_id'])
            )
            
            logger.info(f"Successfully added ₹{credit_amount} to wallet for customer {customer_id}")
            
            return {
                "success": True,
                "message": "Credits added to wallet successfully",
                "wallet_id": str(wallet['_id']),
                "transaction_id": str(transaction['_id']),
                "amount_added": credit_amount,
                "new_balance": wallet['balance'],
                "tier": wallet['tier']
            }
        
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    def initiate_wallet_topup_payment(self, customer_id: str, amount: float, 
                                     payment_method: str) -> Dict:
        """
        Initiate payment for wallet top-up
        
        Called when customer clicks "Add Credits"
        
        Args:
            customer_id: Customer ID
            amount: Amount to add in ₹
            payment_method: "card", "upi", "wallet", "net_banking", "google_pay", "apple_pay"
        
        Returns:
            {
                "success": true,
                "payment_order_id": "order_id",
                "amount": 500.00,
                "gateway": "razorpay",
                "redirect_url": "https://...",
                "key_id": "razorpay_key_id"
            }
        """
        try:
            # Validate customer exists
            wallet = self.wallet_service.get_wallet(customer_id)
            if not wallet:
                return {
                    "success": False,
                    "error": "Wallet not found for customer"
                }
            
            # Create payment with wallet metadata
            payment_order = self.payment_service.create_payment_order(
                customer_id=customer_id,
                amount=amount,
                payment_method=payment_method,
                order_type="wallet_topup",
                metadata={
                    "add_credits": True,
                    "amount": amount,
                    "expiry_days": 365,
                    "tier": wallet['tier'],
                    "current_balance": wallet['balance']
                }
            )
            
            if not payment_order['success']:
                return payment_order
            
            logger.info(f"Created payment order {payment_order['order_id']} for wallet topup")
            
            return {
                "success": True,
                "payment_order_id": payment_order['order_id'],
                "amount": amount,
                "gateway": payment_order.get('gateway', 'razorpay'),
                "redirect_url": payment_order.get('redirect_url'),
                "key_id": payment_order.get('key_id'),
                "currency": "INR"
            }
        
        except Exception as e:
            logger.error(f"Error initiating wallet payment: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def link_payment_to_order(self, order_id: str, customer_id: str, 
                             amount: float, payment_method: str = "wallet") -> Dict:
        """
        Link wallet payment to order (use wallet credits for order payment)
        
        Called when customer selects "Pay from Wallet" at checkout
        
        Args:
            order_id: Order ID
            customer_id: Customer ID
            amount: Amount to deduct from wallet
            payment_method: "wallet" or other methods
        
        Returns:
            {
                "success": true,
                "transaction_id": "tx_123",
                "order_id": "order_123",
                "amount": 500.00,
                "remaining_balance": 2000.00
            }
        """
        try:
            # Verify order exists
            order = self.db.orders.find_one({"_id": order_id})
            if not order:
                return {
                    "success": False,
                    "error": "Order not found"
                }
            
            # Deduct from wallet
            transaction = self.wallet_service.deduct_credits(
                customer_id=customer_id,
                amount=amount,
                reason=f"Order payment #{order_id}",
                order_id=order_id,
                metadata={
                    "order_id": order_id,
                    "payment_method": "wallet"
                }
            )
            
            # Update order with payment info
            self.db.orders.update_one(
                {"_id": order_id},
                {
                    "$set": {
                        "payment_method": "wallet",
                        "payment_status": "PAID",
                        "payment_transaction_id": str(transaction['_id']),
                        "paid_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Get updated wallet
            wallet = self.wallet_service.get_wallet(customer_id)
            
            # Log integration
            self._log_integration_transaction(
                customer_id=customer_id,
                order_id=order_id,
                transaction_id=transaction['_id'],
                amount=amount,
                gateway="wallet",
                status="SUCCESS"
            )
            
            logger.info(f"Linked wallet payment ₹{amount} to order {order_id}")
            
            return {
                "success": True,
                "message": "Payment from wallet successful",
                "transaction_id": str(transaction['_id']),
                "order_id": order_id,
                "amount_paid": amount,
                "remaining_balance": wallet['balance']
            }
        
        except Exception as e:
            logger.error(f"Error linking wallet payment to order: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def process_refund_to_wallet(self, order_id: str, customer_id: str, 
                                 amount: float, reason: str = "Order refund") -> Dict:
        """
        Process refund back to wallet (when order is cancelled)
        
        Args:
            order_id: Order ID
            customer_id: Customer ID
            amount: Refund amount in ₹
            reason: Reason for refund
        
        Returns:
            {
                "success": true,
                "transaction_id": "tx_123",
                "amount": 500.00,
                "new_balance": 2500.00
            }
        """
        try:
            # Refund to wallet
            transaction = self.wallet_service.refund_credits(
                customer_id=customer_id,
                amount=amount,
                reason=reason,
                order_id=order_id,
                metadata={
                    "refund_type": "wallet_credit",
                    "order_id": order_id
                }
            )
            
            # Update order status
            self.db.orders.update_one(
                {"_id": order_id},
                {
                    "$set": {
                        "status": "REFUNDED",
                        "refund_amount": amount,
                        "refund_transaction_id": str(transaction['_id']),
                        "refunded_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Get updated wallet
            wallet = self.wallet_service.get_wallet(customer_id)
            
            # Log integration
            self._log_integration_transaction(
                customer_id=customer_id,
                order_id=order_id,
                transaction_id=transaction['_id'],
                amount=amount,
                gateway="wallet",
                status="REFUNDED"
            )
            
            logger.info(f"Processed refund of ₹{amount} to wallet for order {order_id}")
            
            return {
                "success": True,
                "message": "Refund processed to wallet",
                "transaction_id": str(transaction['_id']),
                "refund_amount": amount,
                "new_balance": wallet['balance']
            }
        
        except Exception as e:
            logger.error(f"Error processing refund: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # ========== HELPER METHODS ==========
    
    def _verify_webhook_signature(self, webhook_data: Dict) -> bool:
        """
        Verify webhook signature from payment gateway
        
        In production, verify the signature matches the gateway's secret
        """
        # TODO: Implement signature verification based on gateway
        # This prevents spoofed webhooks
        signature = webhook_data.get("signature")
        if not signature:
            logger.warning("No signature in webhook")
            return False
        
        # For now, accept if signature present
        return True
    
    def _log_integration_transaction(self, customer_id: str, transaction_id,
                                     amount: float, gateway: str, status: str,
                                     payment_id: str = None, order_id: str = None):
        """
        Log integration transaction for audit trail
        """
        try:
            self.db.integration_logs.insert_one({
                "_id": str(transaction_id),
                "customer_id": customer_id,
                "payment_id": payment_id,
                "order_id": order_id,
                "transaction_id": str(transaction_id),
                "amount": amount,
                "gateway": gateway,
                "status": status,
                "created_at": datetime.utcnow()
            })
        except Exception as e:
            logger.error(f"Error logging integration transaction: {str(e)}")
    
    def _send_wallet_confirmation(self, customer_id: str, amount: float, 
                                  wallet_balance: float, transaction_id: str):
        """
        Send WhatsApp confirmation of wallet credit
        
        Optional: Integrate with WhatsApp API
        """
        try:
            message = f"""
✓ Credits Added to Wallet!

Amount: ₹{amount:.2f}
New Balance: ₹{wallet_balance:.2f}
Transaction ID: {transaction_id}

Thank you for shopping with us!
            """
            
            # TODO: Call WhatsApp API to send message
            logger.info(f"Would send WhatsApp: {message}")
        
        except Exception as e:
            logger.error(f"Error sending WhatsApp confirmation: {str(e)}")
    
    def get_integration_status(self, customer_id: str) -> Dict:
        """
        Get integration status for customer
        
        Shows:
        - Wallet balance
        - Total spent via wallet
        - Total refunded to wallet
        - Payment methods linked
        """
        try:
            wallet = self.wallet_service.get_wallet(customer_id)
            if not wallet:
                return {"success": False, "error": "Wallet not found"}
            
            # Get wallet stats
            stats = self.wallet_service.get_wallet_statistics(customer_id)
            
            # Get recent transactions
            transactions = self.wallet_service.get_transaction_history(
                customer_id=customer_id,
                limit=10
            )
            
            return {
                "success": True,
                "wallet": {
                    "id": str(wallet['_id']),
                    "customer_id": customer_id,
                    "balance": wallet['balance'],
                    "tier": wallet['tier'],
                    "status": wallet['status']
                },
                "statistics": stats,
                "recent_transactions": transactions['transactions'][:5],
                "integration_status": "ACTIVE"
            }
        
        except Exception as e:
            logger.error(f"Error getting integration status: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


# ========== CALLBACK HANDLERS FOR PAYMENT GATEWAYS ==========

def handle_razorpay_webhook(webhook_data: Dict, integration: WalletPaymentIntegration) -> Dict:
    """
    Handle Razorpay webhook callback
    
    Razorpay sends webhook when payment is completed/failed
    """
    logger.info(f"Received Razorpay webhook: {webhook_data.get('event')}")
    
    # Map Razorpay data to integration format
    mapped_data = {
        "payment_id": webhook_data.get("payload", {}).get("payment", {}).get("entity", {}).get("id"),
        "order_id": webhook_data.get("payload", {}).get("payment", {}).get("entity", {}).get("order_id"),
        "amount": webhook_data.get("payload", {}).get("payment", {}).get("entity", {}).get("amount", 0) / 100,
        "status": "SUCCESS" if webhook_data.get("event") == "payment.authorized" else "FAILED",
        "gateway": "razorpay",
        "customer_id": webhook_data.get("customer_id"),
        "user_id": webhook_data.get("user_id"),
        "metadata": webhook_data.get("metadata", {})
    }
    
    return integration.process_payment_webhook(mapped_data)


def handle_paypal_webhook(webhook_data: Dict, integration: WalletPaymentIntegration) -> Dict:
    """
    Handle PayPal webhook callback
    """
    logger.info(f"Received PayPal webhook: {webhook_data.get('event_type')}")
    
    # Map PayPal data to integration format
    mapped_data = {
        "payment_id": webhook_data.get("id"),
        "order_id": webhook_data.get("resource", {}).get("id"),
        "amount": float(webhook_data.get("resource", {}).get("amount", {}).get("value", 0)),
        "status": "SUCCESS" if webhook_data.get("event_type") == "PAYMENT.CAPTURE.COMPLETED" else "FAILED",
        "gateway": "paypal",
        "customer_id": webhook_data.get("customer_id"),
        "user_id": webhook_data.get("user_id"),
        "metadata": webhook_data.get("metadata", {})
    }
    
    return integration.process_payment_webhook(mapped_data)


def handle_google_pay_webhook(webhook_data: Dict, integration: WalletPaymentIntegration) -> Dict:
    """
    Handle Google Pay webhook callback
    """
    logger.info(f"Received Google Pay webhook")
    
    mapped_data = {
        "payment_id": webhook_data.get("paymentMethodToken", {}).get("token"),
        "order_id": webhook_data.get("orderId"),
        "amount": webhook_data.get("transactionInfo", {}).get("totalPrice", 0),
        "status": "SUCCESS" if webhook_data.get("status") == "COMPLETED" else "FAILED",
        "gateway": "google_pay",
        "customer_id": webhook_data.get("customer_id"),
        "user_id": webhook_data.get("user_id"),
        "metadata": webhook_data.get("metadata", {})
    }
    
    return integration.process_payment_webhook(mapped_data)

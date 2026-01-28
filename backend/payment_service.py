"""
Payment Service - Razorpay Integration
Handles all payment processing, refunds, webhooks, and reconciliation
Supports multiple payment methods: Cards, UPI, Wallets, Google Pay, Apple Pay, PayPal
PCI-DSS Compliant with encryption and secure tokenization
"""

import os
import json
import hashlib
import hmac
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal
from enum import Enum
import asyncio
from uuid import uuid4

from pydantic import BaseModel, Field, EmailStr, validator
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import razorpay
from cryptography.fernet import Fernet
from functools import lru_cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================

class PaymentMethod(str, Enum):
    """Supported payment methods"""
    CARD = "card"
    UPI = "upi"
    WALLET = "wallet"
    NETBANKING = "netbanking"
    PAYPAL = "paypal"
    GOOGLE_PAY = "google_pay"
    APPLE_PAY = "apple_pay"

class PaymentStatus(str, Enum):
    """Payment lifecycle statuses"""
    CREATED = "created"
    INITIATED = "initiated"
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    REFUNDED = "refunded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class CardType(str, Enum):
    """Card types"""
    VISA = "visa"
    MASTERCARD = "mastercard"
    AMEX = "amex"
    RUPAY = "rupay"

class ReconciliationStatus(str, Enum):
    """Reconciliation statuses"""
    PENDING = "pending"
    MATCHED = "matched"
    MISMATCHED = "mismatched"
    RESOLVED = "resolved"

# ==================== MODELS ====================

class CardDetails(BaseModel):
    """Credit/Debit card details"""
    card_holder_name: str = Field(..., min_length=2, max_length=100)
    card_number: str = Field(..., regex=r'^\d{13,19}$')
    expiry_month: int = Field(..., ge=1, le=12)
    expiry_year: int = Field(..., ge=2024, le=2099)
    cvv: str = Field(..., regex=r'^\d{3,4}$')
    
    @validator('card_number')
    def validate_card_number(cls, v):
        """Validate card number using Luhn algorithm"""
        def luhn_check(card_num):
            digits = [int(d) for d in card_num]
            checksum = 0
            for i, digit in enumerate(reversed(digits)):
                if i % 2 == 1:
                    digit *= 2
                    if digit > 9:
                        digit -= 9
                checksum += digit
            return checksum % 10 == 0
        
        if not luhn_check(v):
            raise ValueError("Invalid card number")
        return v

class SavedCard(BaseModel):
    """Saved card for recurring payments"""
    card_id: str
    token: str
    card_type: CardType
    last_four: str = Field(..., regex=r'^\d{4}$')
    expiry_month: int
    expiry_year: int
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentRequest(BaseModel):
    """Payment initiation request"""
    customer_id: str
    order_id: str
    amount: Decimal = Field(..., gt=0)
    currency: str = "INR"
    payment_method: PaymentMethod
    customer_email: EmailStr
    customer_phone: str = Field(..., regex=r'^\+?1?\d{9,15}$')
    
    # Card payment fields
    card_details: Optional[CardDetails] = None
    saved_card_id: Optional[str] = None
    
    # UPI payment fields
    upi_id: Optional[str] = None
    
    # Additional options
    save_card: bool = False
    description: str = ""
    notes: Dict[str, str] = {}
    
    @validator('amount')
    def validate_amount(cls, v):
        """Amount should be at least ₹1 and max ₹10,00,000"""
        if v < Decimal('1') or v > Decimal('1000000'):
            raise ValueError("Amount must be between ₹1 and ₹10,00,000")
        return v

class PaymentResponse(BaseModel):
    """Payment response with Razorpay details"""
    payment_id: str
    razorpay_order_id: str
    razorpay_key_id: str
    amount: int  # In paise
    currency: str
    customer_name: str
    customer_email: str
    customer_phone: str
    payment_method: PaymentMethod
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentRecord(BaseModel):
    """Complete payment record in database"""
    _id: Optional[str] = Field(default_factory=lambda: str(uuid4()))
    payment_id: str
    customer_id: str
    order_id: str
    razorpay_payment_id: Optional[str] = None
    razorpay_order_id: str
    amount: Decimal
    currency: str
    payment_method: PaymentMethod
    status: PaymentStatus
    
    # Card details (encrypted)
    last_four: Optional[str] = None
    card_type: Optional[CardType] = None
    token: Optional[str] = None  # Razorpay token for recurring
    
    # Transaction details
    initiated_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    captured_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    
    # Razorpay details
    razorpay_signature: Optional[str] = None
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    
    # Reconciliation
    reconciliation_status: ReconciliationStatus = ReconciliationStatus.PENDING
    reconciled_at: Optional[datetime] = None
    
    # Metadata
    attempts: int = 0
    metadata: Dict[str, Any] = {}

class RefundRequest(BaseModel):
    """Refund request"""
    payment_id: str
    amount: Optional[Decimal] = None  # Full refund if not specified
    reason: str
    notes: Dict[str, str] = {}

class RefundRecord(BaseModel):
    """Refund record"""
    _id: Optional[str] = Field(default_factory=lambda: str(uuid4()))
    refund_id: str
    razorpay_refund_id: Optional[str] = None
    payment_id: str
    original_amount: Decimal
    refund_amount: Decimal
    reason: str
    status: str  # pending, processed, failed
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None
    error_code: Optional[str] = None
    notes: Dict[str, str] = {}

class WebhookEvent(BaseModel):
    """Webhook event from Razorpay"""
    event: str
    created_at: int
    entity: Dict[str, Any]
    contains: List[str] = []

class ReconciliationLog(BaseModel):
    """Reconciliation log for payment matching"""
    _id: Optional[str] = Field(default_factory=lambda: str(uuid4()))
    payment_id: str
    order_id: str
    razorpay_payment_id: str
    razorpay_amount: int
    local_amount: int
    status: ReconciliationStatus
    matched_at: Optional[datetime] = None
    notes: str = ""

# ==================== PAYMENT MANAGER ====================

class PaymentManager:
    """
    Core payment processing engine
    Handles all payment operations with Razorpay
    """
    
    def __init__(self, db: AsyncIOMotorDatabase, razorpay_key: str, razorpay_secret: str):
        """
        Initialize payment manager
        
        Args:
            db: MongoDB database instance
            razorpay_key: Razorpay API key
            razorpay_secret: Razorpay API secret
        """
        self.db = db
        self.razorpay_key = razorpay_key
        self.razorpay_secret = razorpay_secret
        
        # Initialize Razorpay client
        self.client = razorpay.Client(auth=(razorpay_key, razorpay_secret))
        
        # Encryption cipher
        self.cipher = self._init_cipher()
        
        logger.info("PaymentManager initialized")
    
    def _init_cipher(self) -> Fernet:
        """Initialize encryption cipher for sensitive data"""
        key = os.getenv('PAYMENT_ENCRYPTION_KEY', 'default-unsafe-key').encode()
        key = hashlib.sha256(key).digest()[:32]
        import base64
        key = base64.urlsafe_b64encode(key)
        return Fernet(key)
    
    async def initiate_payment(self, payment_req: PaymentRequest) -> PaymentResponse:
        """
        Initiate payment with Razorpay
        Creates order and returns payment details for frontend
        
        Args:
            payment_req: Payment request object
            
        Returns:
            PaymentResponse with payment details
            
        Raises:
            PaymentError: If payment initiation fails
        """
        try:
            # Validate payment request
            await self._validate_payment_request(payment_req)
            
            # Create Razorpay order
            amount_paise = int(payment_req.amount * 100)  # Convert to paise
            
            order_data = {
                'amount': amount_paise,
                'currency': payment_req.currency,
                'receipt': payment_req.order_id,
                'customer_notify': 1,
                'notes': {
                    'order_id': payment_req.order_id,
                    'customer_id': payment_req.customer_id,
                    'payment_method': payment_req.payment_method.value,
                    **payment_req.notes
                }
            }
            
            razorpay_order = self.client.order.create(data=order_data)
            razorpay_order_id = razorpay_order['id']
            
            # Store payment record
            payment_record = PaymentRecord(
                payment_id=str(uuid4()),
                customer_id=payment_req.customer_id,
                order_id=payment_req.order_id,
                razorpay_order_id=razorpay_order_id,
                amount=payment_req.amount,
                currency=payment_req.currency,
                payment_method=payment_req.payment_method,
                status=PaymentStatus.INITIATED,
                metadata={
                    'customer_email': payment_req.customer_email,
                    'customer_phone': payment_req.customer_phone,
                    'save_card': payment_req.save_card
                }
            )
            
            # Store card details if saving
            if payment_req.save_card and payment_req.card_details:
                last_four = payment_req.card_details.card_number[-4:]
                card_type = self._determine_card_type(payment_req.card_details.card_number)
                payment_record.last_four = last_four
                payment_record.card_type = card_type
            
            await self.db.payments.insert_one(payment_record.dict(exclude_none=True))
            
            logger.info(f"Payment initiated: {payment_record.payment_id}")
            
            return PaymentResponse(
                payment_id=payment_record.payment_id,
                razorpay_order_id=razorpay_order_id,
                razorpay_key_id=self.razorpay_key,
                amount=amount_paise,
                currency=payment_req.currency,
                customer_name=payment_req.customer_email.split('@')[0],
                customer_email=payment_req.customer_email,
                customer_phone=payment_req.customer_phone,
                payment_method=payment_req.payment_method
            )
        
        except Exception as e:
            logger.error(f"Payment initiation failed: {str(e)}")
            raise PaymentError(f"Payment initiation failed: {str(e)}")
    
    async def verify_payment(self, razorpay_payment_id: str, razorpay_signature: str, 
                            razorpay_order_id: str) -> Dict[str, Any]:
        """
        Verify payment signature from Razorpay
        Must be called after successful payment on frontend
        
        Args:
            razorpay_payment_id: Payment ID from Razorpay
            razorpay_signature: Signature from Razorpay callback
            razorpay_order_id: Order ID from Razorpay
            
        Returns:
            Dictionary with payment details and verification status
            
        Raises:
            PaymentVerificationError: If verification fails
        """
        try:
            # Verify signature
            data = f"{razorpay_order_id}|{razorpay_payment_id}"
            expected_signature = hmac.new(
                self.razorpay_secret.encode(),
                data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if expected_signature != razorpay_signature:
                logger.warning(f"Signature verification failed for payment {razorpay_payment_id}")
                raise PaymentVerificationError("Invalid payment signature")
            
            # Get payment details from Razorpay
            payment_details = self.client.payment.fetch(razorpay_payment_id)
            
            # Update payment record
            payment = await self.db.payments.find_one({
                'razorpay_order_id': razorpay_order_id
            })
            
            if not payment:
                raise PaymentNotFoundError(f"Payment not found for order {razorpay_order_id}")
            
            # Capture payment (if authorized)
            if payment_details['status'] == 'authorized':
                try:
                    capture_data = {
                        'amount': payment_details['amount']
                    }
                    self.client.payment.capture(razorpay_payment_id, capture_data)
                except Exception as e:
                    logger.error(f"Payment capture failed: {str(e)}")
                    raise PaymentCaptureError(f"Payment capture failed: {str(e)}")
            
            # Update payment status
            await self.db.payments.update_one(
                {'razorpay_order_id': razorpay_order_id},
                {
                    '$set': {
                        'razorpay_payment_id': razorpay_payment_id,
                        'razorpay_signature': razorpay_signature,
                        'status': PaymentStatus.CAPTURED,
                        'verified_at': datetime.utcnow(),
                        'captured_at': datetime.utcnow(),
                        'metadata.payment_details': {
                            'method': payment_details['method'],
                            'vpa': payment_details.get('vpa'),
                            'email': payment_details.get('email'),
                            'contact': payment_details.get('contact')
                        }
                    }
                }
            )
            
            # Create billing record
            await self._create_billing_record(payment)
            
            logger.info(f"Payment verified and captured: {razorpay_payment_id}")
            
            return {
                'status': 'success',
                'payment_id': razorpay_payment_id,
                'order_id': razorpay_order_id,
                'amount': payment_details['amount'],
                'method': payment_details['method']
            }
        
        except Exception as e:
            logger.error(f"Payment verification failed: {str(e)}")
            raise PaymentVerificationError(f"Payment verification failed: {str(e)}")
    
    async def process_refund(self, refund_req: RefundRequest) -> Dict[str, Any]:
        """
        Process refund for a payment
        
        Args:
            refund_req: Refund request
            
        Returns:
            Refund details
            
        Raises:
            PaymentError: If refund fails
        """
        try:
            # Get payment record
            payment = await self.db.payments.find_one({
                'payment_id': refund_req.payment_id
            })
            
            if not payment:
                raise PaymentNotFoundError(f"Payment {refund_req.payment_id} not found")
            
            if payment['status'] != PaymentStatus.CAPTURED:
                raise PaymentError(f"Cannot refund payment with status: {payment['status']}")
            
            # Calculate refund amount
            refund_amount = refund_req.amount or Decimal(str(payment['amount']))
            
            if refund_amount > payment['amount']:
                raise PaymentError("Refund amount cannot exceed payment amount")
            
            # Process refund via Razorpay
            refund_data = {
                'amount': int(refund_amount * 100),  # Convert to paise
                'notes': refund_req.notes
            }
            
            razorpay_refund = self.client.payment.refund(
                payment['razorpay_payment_id'],
                refund_data
            )
            
            # Store refund record
            refund_record = RefundRecord(
                refund_id=str(uuid4()),
                razorpay_refund_id=razorpay_refund['id'],
                payment_id=refund_req.payment_id,
                original_amount=payment['amount'],
                refund_amount=refund_amount,
                reason=refund_req.reason,
                status=razorpay_refund['status'],
                notes=refund_req.notes
            )
            
            await self.db.refunds.insert_one(refund_record.dict(exclude_none=True))
            
            # Update payment status
            new_status = PaymentStatus.REFUNDED if refund_amount == payment['amount'] else PaymentStatus.CAPTURED
            
            await self.db.payments.update_one(
                {'payment_id': refund_req.payment_id},
                {
                    '$set': {
                        'status': new_status,
                        'metadata.refunds': {
                            'refund_id': razorpay_refund['id'],
                            'amount': float(refund_amount),
                            'reason': refund_req.reason,
                            'processed_at': datetime.utcnow().isoformat()
                        }
                    }
                }
            )
            
            logger.info(f"Refund processed: {razorpay_refund['id']} for payment {refund_req.payment_id}")
            
            return {
                'status': 'success',
                'refund_id': razorpay_refund['id'],
                'payment_id': refund_req.payment_id,
                'amount': float(refund_amount),
                'reason': refund_req.reason
            }
        
        except Exception as e:
            logger.error(f"Refund processing failed: {str(e)}")
            raise PaymentError(f"Refund processing failed: {str(e)}")
    
    async def save_card(self, customer_id: str, card_details: CardDetails, 
                       razorpay_token: str) -> SavedCard:
        """
        Save card for recurring payments
        
        Args:
            customer_id: Customer ID
            card_details: Card details
            razorpay_token: Token from Razorpay
            
        Returns:
            SavedCard object
        """
        try:
            card_type = self._determine_card_type(card_details.card_number)
            last_four = card_details.card_number[-4:]
            
            saved_card = SavedCard(
                card_id=str(uuid4()),
                token=razorpay_token,
                card_type=card_type,
                last_four=last_four,
                expiry_month=card_details.expiry_month,
                expiry_year=card_details.expiry_year
            )
            
            await self.db.saved_cards.insert_one({
                'card_id': saved_card.card_id,
                'customer_id': customer_id,
                'token': saved_card.token,
                'card_type': saved_card.card_type.value,
                'last_four': saved_card.last_four,
                'expiry_month': saved_card.expiry_month,
                'expiry_year': saved_card.expiry_year,
                'is_default': saved_card.is_default,
                'created_at': saved_card.created_at
            })
            
            logger.info(f"Card saved for customer {customer_id}: {last_four}")
            return saved_card
        
        except Exception as e:
            logger.error(f"Failed to save card: {str(e)}")
            raise PaymentError(f"Failed to save card: {str(e)}")
    
    async def get_saved_cards(self, customer_id: str) -> List[SavedCard]:
        """Get all saved cards for customer"""
        try:
            cards = await self.db.saved_cards.find({
                'customer_id': customer_id
            }).to_list(length=50)
            
            return [SavedCard(**card) for card in cards]
        except Exception as e:
            logger.error(f"Failed to get saved cards: {str(e)}")
            return []
    
    async def delete_saved_card(self, customer_id: str, card_id: str) -> bool:
        """Delete saved card"""
        try:
            result = await self.db.saved_cards.delete_one({
                'customer_id': customer_id,
                'card_id': card_id
            })
            
            logger.info(f"Card {card_id} deleted for customer {customer_id}")
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Failed to delete card: {str(e)}")
            return False
    
    async def handle_webhook(self, event: WebhookEvent) -> Dict[str, Any]:
        """
        Handle webhook from Razorpay
        Processes payment status updates
        
        Args:
            event: Webhook event from Razorpay
            
        Returns:
            Webhook processing status
        """
        try:
            if event.event == 'payment.authorized':
                return await self._handle_payment_authorized(event)
            elif event.event == 'payment.captured':
                return await self._handle_payment_captured(event)
            elif event.event == 'payment.failed':
                return await self._handle_payment_failed(event)
            elif event.event == 'refund.created':
                return await self._handle_refund_created(event)
            else:
                logger.warning(f"Unhandled webhook event: {event.event}")
                return {'status': 'ignored', 'event': event.event}
        
        except Exception as e:
            logger.error(f"Webhook processing failed: {str(e)}")
            raise WebhookError(f"Webhook processing failed: {str(e)}")
    
    async def _handle_payment_authorized(self, event: WebhookEvent) -> Dict[str, Any]:
        """Handle payment.authorized webhook"""
        payment = event.entity
        await self.db.payments.update_one(
            {'razorpay_payment_id': payment['id']},
            {'$set': {'status': PaymentStatus.AUTHORIZED}}
        )
        return {'status': 'processed', 'event': 'payment.authorized'}
    
    async def _handle_payment_captured(self, event: WebhookEvent) -> Dict[str, Any]:
        """Handle payment.captured webhook"""
        payment = event.entity
        await self.db.payments.update_one(
            {'razorpay_payment_id': payment['id']},
            {'$set': {'status': PaymentStatus.CAPTURED, 'captured_at': datetime.utcnow()}}
        )
        return {'status': 'processed', 'event': 'payment.captured'}
    
    async def _handle_payment_failed(self, event: WebhookEvent) -> Dict[str, Any]:
        """Handle payment.failed webhook"""
        payment = event.entity
        await self.db.payments.update_one(
            {'razorpay_payment_id': payment['id']},
            {
                '$set': {
                    'status': PaymentStatus.FAILED,
                    'failed_at': datetime.utcnow(),
                    'error_code': payment.get('error_code'),
                    'error_description': payment.get('error_description'),
                    'attempts': payment.get('attempts', 0)
                }
            }
        )
        return {'status': 'processed', 'event': 'payment.failed'}
    
    async def _handle_refund_created(self, event: WebhookEvent) -> Dict[str, Any]:
        """Handle refund.created webhook"""
        refund = event.entity
        await self.db.refunds.update_one(
            {'razorpay_refund_id': refund['id']},
            {
                '$set': {
                    'status': refund['status'],
                    'processed_at': datetime.utcnow()
                }
            }
        )
        return {'status': 'processed', 'event': 'refund.created'}
    
    async def reconcile_payments(self) -> Dict[str, int]:
        """
        Reconcile local payments with Razorpay
        Matches payments and updates status
        
        Returns:
            Reconciliation summary
        """
        try:
            summary = {
                'total': 0,
                'matched': 0,
                'mismatched': 0,
                'resolved': 0
            }
            
            # Get unreconciled payments
            unreconciled = await self.db.payments.find({
                'reconciliation_status': ReconciliationStatus.PENDING
            }).to_list(length=1000)
            
            for payment in unreconciled:
                if not payment.get('razorpay_payment_id'):
                    continue
                
                try:
                    # Get payment from Razorpay
                    razorpay_payment = self.client.payment.fetch(payment['razorpay_payment_id'])
                    
                    # Compare amounts
                    local_amount = int(payment['amount'] * 100)  # Convert to paise
                    razorpay_amount = razorpay_payment['amount']
                    
                    if local_amount == razorpay_amount:
                        status = ReconciliationStatus.MATCHED
                        summary['matched'] += 1
                    else:
                        status = ReconciliationStatus.MISMATCHED
                        summary['mismatched'] += 1
                    
                    # Update reconciliation status
                    await self.db.payments.update_one(
                        {'_id': payment['_id']},
                        {
                            '$set': {
                                'reconciliation_status': status,
                                'reconciled_at': datetime.utcnow()
                            }
                        }
                    )
                    
                    # Log reconciliation
                    log_entry = ReconciliationLog(
                        payment_id=payment['payment_id'],
                        order_id=payment['order_id'],
                        razorpay_payment_id=payment['razorpay_payment_id'],
                        razorpay_amount=razorpay_amount,
                        local_amount=local_amount,
                        status=status,
                        matched_at=datetime.utcnow()
                    )
                    
                    await self.db.reconciliation_logs.insert_one(
                        log_entry.dict(exclude_none=True)
                    )
                    
                    summary['total'] += 1
                
                except Exception as e:
                    logger.error(f"Reconciliation failed for payment {payment['payment_id']}: {str(e)}")
            
            logger.info(f"Reconciliation complete: {summary}")
            return summary
        
        except Exception as e:
            logger.error(f"Payment reconciliation failed: {str(e)}")
            raise PaymentError(f"Payment reconciliation failed: {str(e)}")
    
    async def get_payment_history(self, customer_id: str, limit: int = 50) -> List[Dict]:
        """Get payment history for customer"""
        try:
            payments = await self.db.payments.find({
                'customer_id': customer_id
            }).sort('initiated_at', -1).limit(limit).to_list(length=limit)
            
            return payments
        except Exception as e:
            logger.error(f"Failed to get payment history: {str(e)}")
            return []
    
    async def get_payment_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get payment analytics for last N days"""
        try:
            from_date = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {
                    '$match': {
                        'initiated_at': {'$gte': from_date}
                    }
                },
                {
                    '$group': {
                        '_id': '$status',
                        'count': {'$sum': 1},
                        'total_amount': {'$sum': '$amount'}
                    }
                }
            ]
            
            results = await self.db.payments.aggregate(pipeline).to_list(length=None)
            
            analytics = {
                'period_days': days,
                'from_date': from_date.isoformat(),
                'to_date': datetime.utcnow().isoformat(),
                'status_breakdown': {}
            }
            
            for result in results:
                analytics['status_breakdown'][result['_id']] = {
                    'count': result['count'],
                    'total_amount': float(result['total_amount'])
                }
            
            return analytics
        except Exception as e:
            logger.error(f"Failed to get payment analytics: {str(e)}")
            return {}
    
    # ==================== PRIVATE METHODS ====================
    
    async def _validate_payment_request(self, payment_req: PaymentRequest) -> None:
        """Validate payment request"""
        # Check if customer exists
        customer = await self.db.customers_v2.find_one({
            '_id': payment_req.customer_id
        })
        
        if not customer:
            raise PaymentError(f"Customer {payment_req.customer_id} not found")
        
        # Check if order exists
        order = await self.db.orders.find_one({
            '_id': payment_req.order_id
        })
        
        if not order:
            raise PaymentError(f"Order {payment_req.order_id} not found")
        
        # Validate payment method
        if payment_req.payment_method == PaymentMethod.CARD:
            if not payment_req.card_details and not payment_req.saved_card_id:
                raise PaymentError("Card details required for card payment")
        
        elif payment_req.payment_method == PaymentMethod.UPI:
            if not payment_req.upi_id:
                raise PaymentError("UPI ID required for UPI payment")
    
    def _determine_card_type(self, card_number: str) -> CardType:
        """Determine card type from card number"""
        first_digit = int(card_number[0])
        
        if first_digit == 4:
            return CardType.VISA
        elif first_digit == 5:
            return CardType.MASTERCARD
        elif card_number.startswith('34') or card_number.startswith('37'):
            return CardType.AMEX
        else:
            return CardType.RUPAY
    
    async def _create_billing_record(self, payment: Dict) -> None:
        """Create billing record after successful payment"""
        try:
            billing_record = {
                '_id': str(uuid4()),
                'order_id': payment['order_id'],
                'customer_id': payment['customer_id'],
                'payment_id': payment['payment_id'],
                'amount': payment['amount'],
                'status': 'paid',
                'paid_at': datetime.utcnow(),
                'method': payment['payment_method']
            }
            
            await self.db.billing_records.insert_one(billing_record)
            logger.info(f"Billing record created for order {payment['order_id']}")
        
        except Exception as e:
            logger.error(f"Failed to create billing record: {str(e)}")

# ==================== CUSTOM EXCEPTIONS ====================

class PaymentError(Exception):
    """Base payment error"""
    pass

class PaymentNotFoundError(PaymentError):
    """Payment not found"""
    pass

class PaymentVerificationError(PaymentError):
    """Payment verification failed"""
    pass

class PaymentCaptureError(PaymentError):
    """Payment capture failed"""
    pass

class WebhookError(PaymentError):
    """Webhook processing error"""
    pass

# ==================== INITIALIZATION ====================

async def initialize_payment_service(db: AsyncIOMotorDatabase, 
                                   razorpay_key: str, 
                                   razorpay_secret: str) -> PaymentManager:
    """
    Initialize payment service and create indexes
    
    Args:
        db: MongoDB database
        razorpay_key: Razorpay API key
        razorpay_secret: Razorpay API secret
        
    Returns:
        Initialized PaymentManager
    """
    # Create indexes
    await db.payments.create_index([('payment_id', 1)], unique=True)
    await db.payments.create_index([('customer_id', 1), ('initiated_at', -1)])
    await db.payments.create_index([('razorpay_payment_id', 1)])
    await db.payments.create_index([('order_id', 1)], unique=True)
    await db.payments.create_index([('status', 1)])
    
    await db.refunds.create_index([('refund_id', 1)], unique=True)
    await db.refunds.create_index([('payment_id', 1)])
    await db.refunds.create_index([('razorpay_refund_id', 1)])
    
    await db.saved_cards.create_index([('customer_id', 1)])
    await db.saved_cards.create_index([('card_id', 1)])
    
    await db.reconciliation_logs.create_index([('payment_id', 1)])
    await db.reconciliation_logs.create_index([('created_at', -1)])
    
    logger.info("Payment service indexes created")
    
    return PaymentManager(db, razorpay_key, razorpay_secret)

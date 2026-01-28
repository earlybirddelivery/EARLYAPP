"""
Payment API Routes
REST endpoints for payment processing, refunds, and saved cards
Includes webhook handling and payment history
"""

import os
import json
import hmac
import hashlib
import logging
from decimal import Decimal
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field

from payment_service import (
    PaymentManager,
    PaymentRequest,
    RefundRequest,
    PaymentError,
    PaymentNotFoundError,
    PaymentVerificationError,
    WebhookEvent
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/api", tags=["payments"])

# ==================== RESPONSE MODELS ====================

class ErrorResponse(BaseModel):
    """Error response"""
    status: str = "error"
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class SuccessResponse(BaseModel):
    """Success response"""
    status: str = "success"
    data: Dict[str, Any] = {}
    message: Optional[str] = None

# ==================== DEPENDENCY INJECTION ====================

async def get_payment_manager() -> PaymentManager:
    """Get payment manager instance"""
    from server import db  # Import from main server
    
    razorpay_key = os.getenv('RAZORPAY_KEY_ID')
    razorpay_secret = os.getenv('RAZORPAY_KEY_SECRET')
    
    if not razorpay_key or not razorpay_secret:
        raise HTTPException(
            status_code=500,
            detail="Razorpay credentials not configured"
        )
    
    # Create manager instance (ideally cached)
    return PaymentManager(db, razorpay_key, razorpay_secret)

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict:
    """Get current user from auth token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Extract token and verify (implementation depends on auth system)
    try:
        token = authorization.split(' ')[1]
        # Verify token and extract user_id
        # This is a placeholder - implement based on your auth system
        user_id = "current_user"  # Replace with actual user extraction
        return {'user_id': user_id}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== PAYMENT ENDPOINTS ====================

@router.post("/payments/initiate")
async def initiate_payment(
    payment_req: PaymentRequest,
    current_user: Dict = Depends(get_current_user),
    payment_manager: PaymentManager = Depends(get_payment_manager)
) -> SuccessResponse:
    """
    Initiate payment
    
    **Request:**
    ```json
    {
      "customer_id": "cust_123",
      "order_id": "ord_456",
      "amount": 1999.99,
      "payment_method": "card",
      "customer_email": "user@example.com",
      "customer_phone": "+919876543210",
      "card_details": {
        "card_holder_name": "John Doe",
        "card_number": "4111111111111111",
        "expiry_month": 12,
        "expiry_year": 2026,
        "cvv": "123"
      },
      "save_card": true
    }
    ```
    
    **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "payment_id": "pay_123",
        "razorpay_order_id": "order_1234567890",
        "razorpay_key_id": "rzp_test_xxxxx",
        "amount": 199999,
        "currency": "INR",
        "customer_email": "user@example.com",
        "customer_phone": "+919876543210",
        "payment_method": "card"
      }
    }
    ```
    """
    try:
        # Verify customer is owner
        if payment_req.customer_id != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Initiate payment
        payment_response = await payment_manager.initiate_payment(payment_req)
        
        logger.info(f"Payment initiated: {payment_response.payment_id}")
        
        return SuccessResponse(
            data=payment_response.dict(),
            message="Payment initiated successfully"
        )
    
    except PaymentError as e:
        logger.error(f"Payment initiation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in payment initiation: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment initiation failed")

@router.post("/payments/verify")
async def verify_payment(
    request: Dict = None,
    current_user: Dict = Depends(get_current_user),
    payment_manager: PaymentManager = Depends(get_payment_manager)
) -> SuccessResponse:
    """
    Verify payment after successful payment on frontend
    
    **Request:**
    ```json
    {
      "razorpay_payment_id": "pay_123xyz",
      "razorpay_order_id": "order_1234567890",
      "razorpay_signature": "signature_hash"
    }
    ```
    
    **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "status": "success",
        "payment_id": "pay_123xyz",
        "order_id": "order_1234567890",
        "amount": 199999,
        "method": "card"
      }
    }
    ```
    """
    try:
        razorpay_payment_id = request.get('razorpay_payment_id')
        razorpay_order_id = request.get('razorpay_order_id')
        razorpay_signature = request.get('razorpay_signature')
        
        if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Verify payment
        result = await payment_manager.verify_payment(
            razorpay_payment_id,
            razorpay_signature,
            razorpay_order_id
        )
        
        logger.info(f"Payment verified: {razorpay_payment_id}")
        
        return SuccessResponse(
            data=result,
            message="Payment verified successfully"
        )
    
    except PaymentVerificationError as e:
        logger.error(f"Payment verification error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except PaymentNotFoundError as e:
        logger.error(f"Payment not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in payment verification: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment verification failed")

@router.post("/payments/refund")
async def refund_payment(
    refund_req: RefundRequest,
    current_user: Dict = Depends(get_current_user),
    payment_manager: PaymentManager = Depends(get_payment_manager)
) -> SuccessResponse:
    """
    Process refund for a payment
    
    **Request:**
    ```json
    {
      "payment_id": "pay_123",
      "amount": 1999.99,
      "reason": "Customer requested refund",
      "notes": {
        "order_id": "ord_456"
      }
    }
    ```
    
    **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "status": "success",
        "refund_id": "rfnd_123",
        "payment_id": "pay_123",
        "amount": 1999.99,
        "reason": "Customer requested refund"
      }
    }
    ```
    """
    try:
        # Process refund
        result = await payment_manager.process_refund(refund_req)
        
        logger.info(f"Refund processed: {result['refund_id']}")
        
        return SuccessResponse(
            data=result,
            message="Refund processed successfully"
        )
    
    except PaymentError as e:
        logger.error(f"Refund error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in refund: {str(e)}")
        raise HTTPException(status_code=500, detail="Refund processing failed")

@router.get("/payments/history")
async def get_payment_history(
    limit: int = 50,
    current_user: Dict = Depends(get_current_user),
    payment_manager: PaymentManager = Depends(get_payment_manager)
) -> SuccessResponse:
    """
    Get payment history for current user
    
    **Query Parameters:**
    - `limit`: Number of records (default: 50, max: 100)
    
    **Response:**
    ```json
    {
      "status": "success",
      "data": [
        {
          "payment_id": "pay_123",
          "order_id": "ord_456",
          "amount": 1999.99,
          "status": "captured",
          "initiated_at": "2025-01-27T10:00:00Z",
          "verified_at": "2025-01-27T10:05:00Z",
          "payment_method": "card",
          "last_four": "1111"
        }
      ]
    }
    ```
    """
    try:
        if limit > 100:
            limit = 100
        
        payments = await payment_manager.get_payment_history(
            current_user['user_id'],
            limit
        )
        
        return SuccessResponse(
            data={'payments': payments}
        )
    except Exception as e:
        logger.error(f"Error fetching payment history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch payment history")

@router.get("/payments/{payment_id}")
async def get_payment_details(
    payment_id: str,
    current_user: Dict = Depends(get_current_user),
    payment_manager: PaymentManager = Depends(get_payment_manager)
) -> SuccessResponse:
    """
    Get payment details
    
    **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "payment_id": "pay_123",
        "customer_id": "cust_456",
        "order_id": "ord_789",
        "amount": 1999.99,
        "currency": "INR",
        "status": "captured",
        "payment_method": "card",
        "initiated_at": "2025-01-27T10:00:00Z",
        "verified_at": "2025-01-27T10:05:00Z",
        "captured_at": "2025-01-27T10:05:00Z"
      }
    }
    ```
    """
    try:
        from server import db
        
        payment = await db.payments.find_one({'payment_id': payment_id})
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Verify ownership
        if payment['customer_id'] != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Remove sensitive fields
        payment.pop('metadata', None)
        
        return SuccessResponse(data=payment)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching payment details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch payment")

# ==================== SAVED CARDS ENDPOINTS ====================

@router.get("/payments/saved-cards")
async def get_saved_cards(
    current_user: Dict = Depends(get_current_user),
    payment_manager: PaymentManager = Depends(get_payment_manager)
) -> SuccessResponse:
    """
    Get all saved cards for current user
    
    **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "cards": [
          {
            "card_id": "card_123",
            "card_type": "visa",
            "last_four": "1111",
            "expiry_month": 12,
            "expiry_year": 2026,
            "is_default": true,
            "created_at": "2025-01-27T10:00:00Z"
          }
        ]
      }
    }
    ```
    """
    try:
        cards = await payment_manager.get_saved_cards(current_user['user_id'])
        
        return SuccessResponse(
            data={'cards': [card.dict() for card in cards]}
        )
    except Exception as e:
        logger.error(f"Error fetching saved cards: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch saved cards")

@router.delete("/payments/saved-cards/{card_id}")
async def delete_saved_card(
    card_id: str,
    current_user: Dict = Depends(get_current_user),
    payment_manager: PaymentManager = Depends(get_payment_manager)
) -> SuccessResponse:
    """
    Delete a saved card
    
    **Response:**
    ```json
    {
      "status": "success",
      "message": "Card deleted successfully"
    }
    ```
    """
    try:
        success = await payment_manager.delete_saved_card(
            current_user['user_id'],
            card_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Card not found")
        
        return SuccessResponse(message="Card deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting card: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete card")

# ==================== WEBHOOK ENDPOINTS ====================

@router.post("/payments/webhook")
async def handle_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    payment_manager: PaymentManager = Depends(get_payment_manager)
) -> JSONResponse:
    """
    Handle Razorpay webhook
    Verifies signature and processes payment events
    
    **Webhook Events:**
    - `payment.authorized`: Payment authorized
    - `payment.captured`: Payment captured
    - `payment.failed`: Payment failed
    - `refund.created`: Refund created
    
    **Security:**
    Webhook signature verified using HMAC-SHA256
    """
    try:
        # Get raw body
        body = await request.body()
        
        # Verify webhook signature
        razorpay_secret = os.getenv('RAZORPAY_KEY_SECRET', '')
        expected_signature = hmac.new(
            razorpay_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if expected_signature != x_razorpay_signature:
            logger.warning("Invalid webhook signature")
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Invalid signature"}
            )
        
        # Parse webhook event
        event_data = json.loads(body)
        
        # Create webhook event
        event = WebhookEvent(
            event=event_data.get('event'),
            created_at=event_data.get('created_at'),
            entity=event_data.get('entity', {}),
            contains=event_data.get('contains', [])
        )
        
        # Handle webhook
        result = await payment_manager.handle_webhook(event)
        
        logger.info(f"Webhook processed: {event.event}")
        
        return JSONResponse(
            status_code=200,
            content={"status": "success", **result}
        )
    
    except Exception as e:
        logger.error(f"Webhook processing error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Webhook processing failed"}
        )

# ==================== ANALYTICS ENDPOINTS ====================

@router.get("/payments/analytics")
async def get_payment_analytics(
    days: int = 30,
    current_user: Dict = Depends(get_current_user),
    payment_manager: PaymentManager = Depends(get_payment_manager)
) -> SuccessResponse:
    """
    Get payment analytics for last N days
    
    **Query Parameters:**
    - `days`: Number of days to analyze (default: 30)
    
    **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "period_days": 30,
        "from_date": "2024-12-28T10:00:00Z",
        "to_date": "2025-01-27T10:00:00Z",
        "status_breakdown": {
          "captured": {
            "count": 45,
            "total_amount": 89999.99
          },
          "failed": {
            "count": 3,
            "total_amount": 5999.99
          },
          "refunded": {
            "count": 2,
            "total_amount": 1999.99
          }
        }
      }
    }
    ```
    """
    try:
        if days < 1 or days > 365:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 365")
        
        analytics = await payment_manager.get_payment_analytics(days)
        
        return SuccessResponse(data=analytics)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")

# ==================== RECONCILIATION ENDPOINTS ====================

@router.post("/payments/reconcile")
async def reconcile_payments(
    current_user: Dict = Depends(get_current_user),
    payment_manager: PaymentManager = Depends(get_payment_manager)
) -> SuccessResponse:
    """
    Trigger payment reconciliation
    Matches local payments with Razorpay
    
    **Admin Only**
    
    **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "total": 100,
        "matched": 98,
        "mismatched": 2,
        "resolved": 0
      },
      "message": "Reconciliation complete"
    }
    ```
    """
    try:
        # TODO: Verify admin role
        
        summary = await payment_manager.reconcile_payments()
        
        logger.info(f"Reconciliation completed: {summary}")
        
        return SuccessResponse(
            data=summary,
            message="Reconciliation complete"
        )
    except Exception as e:
        logger.error(f"Reconciliation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Reconciliation failed")

# ==================== PAYMENT METHODS ENDPOINT ====================

@router.get("/payments/methods")
async def get_payment_methods() -> SuccessResponse:
    """
    Get list of supported payment methods
    
    **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "methods": [
          {
            "id": "card",
            "name": "Credit/Debit Card",
            "enabled": true,
            "description": "Visa, Mastercard, Amex, RuPay"
          },
          {
            "id": "upi",
            "name": "UPI",
            "enabled": true,
            "description": "Bharat QR, Google Pay, PhonePe, Paytm"
          },
          {
            "id": "wallet",
            "name": "Digital Wallet",
            "enabled": true,
            "description": "Apple Pay, Google Pay"
          },
          {
            "id": "netbanking",
            "name": "Net Banking",
            "enabled": true,
            "description": "All major Indian banks"
          },
          {
            "id": "paypal",
            "name": "PayPal",
            "enabled": true,
            "description": "International payments"
          }
        ]
      }
    }
    ```
    """
    return SuccessResponse(
        data={
            'methods': [
                {
                    'id': 'card',
                    'name': 'Credit/Debit Card',
                    'enabled': True,
                    'description': 'Visa, Mastercard, Amex, RuPay'
                },
                {
                    'id': 'upi',
                    'name': 'UPI',
                    'enabled': True,
                    'description': 'Bharat QR, Google Pay, PhonePe, Paytm'
                },
                {
                    'id': 'wallet',
                    'name': 'Digital Wallet',
                    'enabled': True,
                    'description': 'Apple Pay, Google Pay'
                },
                {
                    'id': 'netbanking',
                    'name': 'Net Banking',
                    'enabled': True,
                    'description': 'All major Indian banks'
                },
                {
                    'id': 'paypal',
                    'name': 'PayPal',
                    'enabled': True,
                    'description': 'International payments'
                },
                {
                    'id': 'google_pay',
                    'name': 'Google Pay',
                    'enabled': True,
                    'description': 'Android & Web'
                },
                {
                    'id': 'apple_pay',
                    'name': 'Apple Pay',
                    'enabled': True,
                    'description': 'iOS & Web'
                }
            ]
        }
    )

"""
EarlyBird Critical Systems - API Routes Implementation
Comprehensive REST API endpoints for all 7 critical backend systems
"""

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
import uuid
import os

# Import models
from models_critical_systems import *

# Initialize FastAPI app
app = FastAPI(
    title="EarlyBird Critical Systems API",
    description="Payment, Calendar, Voice, OCR, Forecasting, Supplier, and Inventory Management",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize router
router = APIRouter(prefix="/api", tags=["Critical Systems"])

# ==================== ROOT HEALTH CHECK ====================

@app.get("/")
async def root():
    """Root health check"""
    return {
        "message": "EarlyBird Critical Systems API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "All critical systems operational"
    }

# Mock database storage (replace with actual MongoDB operations)
payment_links_db = {}
transactions_db = {}
wallets_db = {}
calendar_events_db = {}
voice_orders_db = {}
ocr_orders_db = {}
forecasts_db = {}
suppliers_db = {}
purchase_orders_db = {}
inventory_alerts_db = {}
inventory_levels_db = {}

# ==================== PAYMENT SYSTEM ENDPOINTS ====================

@router.post("/wallet/payment-link", response_model=APIResponse)
async def create_payment_link(request: PaymentLinkCreate):
    """Generate a payment link for a customer order"""
    try:
        payment_link_id = f"link_{uuid.uuid4().hex[:12]}"
        
        # Generate appropriate link based on payment method
        if request.method == PaymentMethod.RAZORPAY:
            payment_link = f"https://razorpay.com/pay/{payment_link_id}"
        elif request.method == PaymentMethod.PAYUMONEY:
            payment_link = f"https://payumoney.com/checkout/{payment_link_id}"
        elif request.method == PaymentMethod.UPI:
            payment_link = f"upi://pay?pa=earlybird@bank&pn=EarlyBird&am={request.amount}&tr={payment_link_id}"
        else:
            payment_link = f"wallet://pay/{payment_link_id}"
        
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        link_data = {
            "id": payment_link_id,
            "customer_id": request.customer_id,
            "amount": request.amount,
            "order_id": request.order_id,
            "method": request.method,
            "payment_link": payment_link,
            "status": PaymentStatus.PENDING.value,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat(),
            "metadata": {}
        }
        
        payment_links_db[payment_link_id] = link_data
        
        return APIResponse(
            success=True,
            message="Payment link created successfully",
            data=link_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payments/process", response_model=APIResponse)
async def process_payment(payment: PaymentTransaction):
    """Process payment transaction"""
    try:
        # Validate payment amount
        if payment.amount <= 0:
            raise ValueError("Payment amount must be positive")
        
        # Process payment based on method
        gateway_response = {
            "gateway_txn_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "success"
        }
        
        # Update transaction
        payment_data = {
            "id": payment.id,
            "customer_id": payment.customer_id,
            "order_id": payment.order_id,
            "amount": payment.amount,
            "method": payment.method.value,
            "status": PaymentStatus.COMPLETED.value,
            "transaction_id": gateway_response["gateway_txn_id"],
            "gateway_response": gateway_response,
            "created_at": payment.created_at.isoformat(),
            "completed_at": datetime.utcnow().isoformat()
        }
        
        transactions_db[payment.id] = payment_data
        
        # Update wallet if wallet payment
        if payment.method == PaymentMethod.WALLET:
            await deduct_wallet_credit(payment.customer_id, payment.amount)
        
        return APIResponse(
            success=True,
            message="Payment processed successfully",
            data=payment_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/payments/webhook", response_model=APIResponse)
async def handle_payment_webhook(payload: Dict[str, Any]):
    """Handle payment gateway webhook"""
    try:
        gateway_event = payload.get("event")
        
        if gateway_event in ["payment.success", "payment.completed"]:
            # Update transaction status
            transaction_id = payload.get("transaction_id")
            if transaction_id in transactions_db:
                transactions_db[transaction_id]["status"] = PaymentStatus.COMPLETED.value
        elif gateway_event in ["payment.failed", "payment.error"]:
            transaction_id = payload.get("transaction_id")
            if transaction_id in transactions_db:
                transactions_db[transaction_id]["status"] = PaymentStatus.FAILED.value
                transactions_db[transaction_id]["error_message"] = payload.get("message", "Payment failed")
        
        return APIResponse(
            success=True,
            message="Webhook processed successfully",
            data={"event": gateway_event}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/wallet/balance", response_model=APIResponse)
async def get_wallet_balance(customer_id: str):
    """Get current wallet balance"""
    try:
        if customer_id not in wallets_db:
            # Create new wallet
            wallet = {
                "customer_id": customer_id,
                "balance": 0.0,
                "total_credited": 0.0,
                "total_debited": 0.0,
                "created_at": datetime.utcnow().isoformat()
            }
            wallets_db[customer_id] = wallet
        
        wallet = wallets_db[customer_id]
        return APIResponse(
            success=True,
            message="Wallet balance retrieved",
            data=wallet
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/wallet/deduct", response_model=APIResponse)
async def deduct_wallet_credit(customer_id: str, amount: float):
    """Deduct credit from wallet"""
    try:
        if customer_id not in wallets_db:
            raise ValueError("Wallet not found")
        
        wallet = wallets_db[customer_id]
        
        if wallet["balance"] < amount:
            raise ValueError("Insufficient wallet balance")
        
        # Create transaction
        txn = {
            "id": f"wallet_{uuid.uuid4().hex[:12]}",
            "customer_id": customer_id,
            "amount": amount,
            "transaction_type": "debit",
            "reason": "payment",
            "balance_before": wallet["balance"],
            "balance_after": wallet["balance"] - amount,
            "created_at": datetime.utcnow().isoformat()
        }
        
        wallet["balance"] -= amount
        wallet["total_debited"] += amount
        wallet["updated_at"] = datetime.utcnow().isoformat()
        
        return APIResponse(
            success=True,
            message="Wallet deducted successfully",
            data=txn
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/wallet/credit", response_model=APIResponse)
async def add_wallet_credit(customer_id: str, amount: float, reason: str):
    """Add credit to wallet"""
    try:
        if customer_id not in wallets_db:
            wallet = {
                "customer_id": customer_id,
                "balance": 0.0,
                "total_credited": 0.0,
                "total_debited": 0.0,
                "created_at": datetime.utcnow().isoformat()
            }
            wallets_db[customer_id] = wallet
        
        wallet = wallets_db[customer_id]
        
        # Create transaction
        txn = {
            "id": f"wallet_{uuid.uuid4().hex[:12]}",
            "customer_id": customer_id,
            "amount": amount,
            "transaction_type": "credit",
            "reason": reason,
            "balance_before": wallet["balance"],
            "balance_after": wallet["balance"] + amount,
            "created_at": datetime.utcnow().isoformat()
        }
        
        wallet["balance"] += amount
        wallet["total_credited"] += amount
        wallet["updated_at"] = datetime.utcnow().isoformat()
        
        return APIResponse(
            success=True,
            message="Wallet credited successfully",
            data=txn
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== CALENDAR SYSTEM ENDPOINTS ====================

@router.post("/calendar/events", response_model=APIResponse)
async def save_calendar_events(customer_id: str, events: List[CalendarEvent]):
    """Save calendar events for a customer"""
    try:
        saved_events = []
        
        for event in events:
            event_id = f"evt_{uuid.uuid4().hex[:12]}"
            event_data = {
                "id": event_id,
                "customer_id": customer_id,
                "event_date": event.event_date.isoformat() if event.event_date else None,
                "event_type": event.event_type.value,
                "count": event.count,
                "description": event.description,
                "metadata": event.metadata,
                "created_at": datetime.utcnow().isoformat()
            }
            
            calendar_events_db[event_id] = event_data
            saved_events.append(event_data)
        
        return APIResponse(
            success=True,
            message=f"Saved {len(saved_events)} calendar events",
            data={"events": saved_events, "count": len(saved_events)}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/calendar/heatmap", response_model=APIResponse)
async def get_calendar_heatmap(customer_id: str, year: int, month: int):
    """Get calendar heatmap data for a month"""
    try:
        heatmap_data = []
        
        # Get all events for the month
        for event_id, event in calendar_events_db.items():
            if event["customer_id"] == customer_id:
                event_date = datetime.fromisoformat(event["event_date"])
                if event_date.year == year and event_date.month == month:
                    heatmap_data.append({
                        "date": event["event_date"],
                        "event_count": event["count"],
                        "event_type": event["event_type"],
                        "heat_level": min(5, event["count"] // 20)  # Scale to 0-5
                    })
        
        return APIResponse(
            success=True,
            message="Calendar heatmap retrieved",
            data={"heatmap": heatmap_data, "year": year, "month": month}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/calendar/stats", response_model=APIResponse)
async def get_calendar_stats(customer_id: str, year: int, month: int):
    """Get calendar statistics for a month"""
    try:
        total_orders = 0
        total_deliveries = 0
        total_subscriptions = 0
        busiest_day = None
        busiest_count = 0
        
        # Calculate stats
        for event_id, event in calendar_events_db.items():
            if event["customer_id"] == customer_id:
                event_date = datetime.fromisoformat(event["event_date"])
                if event_date.year == year and event_date.month == month:
                    if event["event_type"] == "order":
                        total_orders += event["count"]
                    elif event["event_type"] == "delivery":
                        total_deliveries += event["count"]
                    elif event["event_type"] == "subscription":
                        total_subscriptions += event["count"]
                    
                    if event["count"] > busiest_count:
                        busiest_count = event["count"]
                        busiest_day = event["event_date"]
        
        stats = {
            "year": year,
            "month": month,
            "total_orders": total_orders,
            "total_deliveries": total_deliveries,
            "total_subscriptions": total_subscriptions,
            "busiest_day": busiest_day,
            "busiest_day_count": busiest_count,
            "average_daily_orders": total_orders / 30 if total_orders > 0 else 0
        }
        
        return APIResponse(
            success=True,
            message="Calendar statistics retrieved",
            data=stats
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== VOICE ORDER SYSTEM ENDPOINTS ====================

@router.post("/voice/create-order", response_model=APIResponse)
async def create_voice_order(voice_order: VoiceOrder):
    """Create order from voice transcription"""
    try:
        voice_order_id = f"vord_{uuid.uuid4().hex[:12]}"
        
        # Validate voice order
        if not voice_order.parsed_items or len(voice_order.parsed_items) == 0:
            raise ValueError("No items parsed from voice transcription")
        
        order_data = {
            "id": voice_order_id,
            "customer_id": voice_order.customer_id,
            "transcript_id": voice_order.transcript_id,
            "language": voice_order.language,
            "parsed_items": [
                {
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "confidence": item.confidence,
                    "price_estimate": item.price_estimate
                }
                for item in voice_order.parsed_items
            ],
            "total_items": voice_order.total_items,
            "estimated_total": voice_order.estimated_total,
            "confidence_score": voice_order.confidence_score,
            "confirmed": True,
            "created_at": datetime.utcnow().isoformat()
        }
        
        voice_orders_db[voice_order_id] = order_data
        
        return APIResponse(
            success=True,
            message="Voice order created successfully",
            data=order_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/voice/history", response_model=APIResponse)
async def get_voice_order_history(customer_id: str, limit: int = Query(10, ge=1, le=100)):
    """Get voice order history for a customer"""
    try:
        orders = []
        
        for order_id, order in voice_orders_db.items():
            if order["customer_id"] == customer_id:
                orders.append(order)
        
        # Sort by created_at descending and limit
        orders = sorted(orders, key=lambda x: x["created_at"], reverse=True)[:limit]
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(orders)} voice orders",
            data={
                "orders": orders,
                "total": len(orders),
                "limit": limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice/parse-transcript", response_model=APIResponse)
async def parse_voice_transcript(customer_id: str, transcript: str, language: str = "en"):
    """Parse natural language transcript into order items"""
    try:
        # Mock parsing logic - in production use NLP
        parsed_items = []
        
        # Simple keyword-based parsing
        common_items = {
            "milk": {"unit": "liter", "price": 80},
            "bread": {"unit": "pieces", "price": 50},
            "butter": {"unit": "kg", "price": 400},
            "paneer": {"unit": "kg", "price": 300},
            "curd": {"unit": "liter", "price": 60},
            "vegetables": {"unit": "kg", "price": 100},
        }
        
        for item_name, item_data in common_items.items():
            if item_name in transcript.lower():
                parsed_items.append({
                    "product_name": item_name,
                    "quantity": 1,
                    "unit": item_data["unit"],
                    "confidence": 0.85,
                    "price_estimate": item_data["price"]
                })
        
        if not parsed_items:
            raise ValueError("No recognized items in transcript")
        
        total_estimate = sum(item["price_estimate"] * item["quantity"] for item in parsed_items)
        
        return APIResponse(
            success=True,
            message="Transcript parsed successfully",
            data={
                "parsed_items": parsed_items,
                "total_items": len(parsed_items),
                "estimated_total": total_estimate,
                "confidence_score": 0.85
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== OCR SYSTEM ENDPOINTS ====================

@router.post("/ocr/process-image", response_model=APIResponse)
async def process_ocr_image(customer_id: str, image_path: str):
    """Process image and extract text via OCR"""
    try:
        # Mock OCR processing
        extracted_text = "Milk 1 liter, Bread 2 pieces, Butter 500g, Paneer 250g"
        
        ocr_upload = {
            "id": f"ocr_{uuid.uuid4().hex[:12]}",
            "customer_id": customer_id,
            "image_path": image_path,
            "extracted_text": extracted_text,
            "upload_timestamp": datetime.utcnow().isoformat()
        }
        
        return APIResponse(
            success=True,
            message="Image processed via OCR",
            data=ocr_upload
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ocr/create-order", response_model=APIResponse)
async def create_ocr_order(ocr_order: OCROrder):
    """Create order from OCR data"""
    try:
        ocr_order_id = f"oord_{uuid.uuid4().hex[:12]}"
        
        if not ocr_order.parsed_items or len(ocr_order.parsed_items) == 0:
            raise ValueError("No items parsed from OCR")
        
        order_data = {
            "id": ocr_order_id,
            "customer_id": ocr_order.customer_id,
            "image_id": ocr_order.image_id,
            "extracted_text": ocr_order.extracted_text,
            "parsed_items": [
                {
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "confidence": item.confidence,
                    "price_estimate": item.price_estimate
                }
                for item in ocr_order.parsed_items
            ],
            "total_items": ocr_order.total_items,
            "estimated_total": ocr_order.estimated_total,
            "confidence_score": ocr_order.confidence_score,
            "confirmed": True,
            "created_at": datetime.utcnow().isoformat()
        }
        
        ocr_orders_db[ocr_order_id] = order_data
        
        return APIResponse(
            success=True,
            message="OCR order created successfully",
            data=order_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/ocr/history", response_model=APIResponse)
async def get_ocr_order_history(customer_id: str, limit: int = Query(10, ge=1, le=100)):
    """Get OCR order history"""
    try:
        orders = []
        
        for order_id, order in ocr_orders_db.items():
            if order["customer_id"] == customer_id:
                orders.append(order)
        
        orders = sorted(orders, key=lambda x: x["created_at"], reverse=True)[:limit]
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(orders)} OCR orders",
            data={
                "orders": orders,
                "total": len(orders),
                "limit": limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== FORECASTING SYSTEM ENDPOINTS ====================

@router.post("/forecasting/predict", response_model=APIResponse)
async def generate_demand_forecast(product_name: str, forecast_days: int = 7):
    """Generate demand forecast for a product"""
    try:
        if forecast_days < 1 or forecast_days > 90:
            raise ValueError("Forecast days must be between 1 and 90")
        
        daily_forecasts = []
        base_quantity = 100
        
        for day_offset in range(forecast_days):
            forecast_date = date.today() + timedelta(days=day_offset)
            
            # Mock forecast with seasonal pattern
            seasonal_factor = 1.2 if forecast_date.weekday() < 5 else 1.5
            predicted = base_quantity * seasonal_factor * (1 + day_offset * 0.01)
            
            daily_forecasts.append({
                "date": forecast_date.isoformat(),
                "product_name": product_name,
                "predicted_quantity": round(predicted, 2),
                "confidence": 0.85,
                "trend": "stable",
                "seasonal_factor": seasonal_factor,
                "lower_bound": round(predicted * 0.8, 2),
                "upper_bound": round(predicted * 1.2, 2)
            })
        
        total_predicted = sum(f["predicted_quantity"] for f in daily_forecasts)
        
        forecast_data = {
            "id": f"fcst_{uuid.uuid4().hex[:12]}",
            "product_name": product_name,
            "forecast_period": forecast_days,
            "daily_forecasts": daily_forecasts,
            "total_predicted": round(total_predicted, 2),
            "average_daily": round(total_predicted / forecast_days, 2),
            "trend": "stable",
            "confidence": 0.85,
            "stock_risk": "safe",
            "current_stock": 500.0,
            "reorder_point": 200.0,
            "safety_stock": 100.0,
            "created_at": datetime.utcnow().isoformat(),
            "valid_until": (datetime.utcnow() + timedelta(days=7)).isoformat()
        }
        
        forecasts_db[forecast_data["id"]] = forecast_data
        
        return APIResponse(
            success=True,
            message=f"Forecast generated for {product_name}",
            data=forecast_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/forecasting/accuracy", response_model=APIResponse)
async def get_forecast_accuracy(forecast_id: str):
    """Get forecast accuracy metrics"""
    try:
        if forecast_id not in forecasts_db:
            raise ValueError("Forecast not found")
        
        forecast = forecasts_db[forecast_id]
        
        # Mock accuracy calculation
        accuracy_data = {
            "forecast_id": forecast_id,
            "product_name": forecast["product_name"],
            "mape": 8.5,  # Mean Absolute Percentage Error
            "rmse": 12.3,
            "mae": 9.7,
            "accuracy_percentage": 91.5,  # 100 - MAPE
            "calculated_at": datetime.utcnow().isoformat()
        }
        
        return APIResponse(
            success=True,
            message="Forecast accuracy retrieved",
            data=accuracy_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/forecasting/historical", response_model=APIResponse)
async def get_historical_orders(product_name: str, days: int = Query(30, ge=1, le=365)):
    """Get historical order data for a product"""
    try:
        # Mock historical data
        historical_data = []
        
        for day_offset in range(days):
            data_date = date.today() - timedelta(days=day_offset)
            quantity = 100 + (50 * (data_date.weekday() / 7))
            
            historical_data.append({
                "date": data_date.isoformat(),
                "product_name": product_name,
                "actual_quantity": round(quantity, 2),
                "orders_count": int(quantity / 10)
            })
        
        historical_data = sorted(historical_data, key=lambda x: x["date"])
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(historical_data)} days of historical data",
            data={
                "product_name": product_name,
                "data_points": historical_data,
                "total_days": len(historical_data)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== SUPPLIER SYSTEM ENDPOINTS ====================

@router.post("/suppliers/register", response_model=APIResponse)
async def register_supplier(supplier: Supplier):
    """Register a new supplier"""
    try:
        supplier_id = f"sup_{uuid.uuid4().hex[:12]}"
        
        supplier_data = {
            "id": supplier_id,
            "name": supplier.name,
            "category": supplier.category,
            "location": supplier.location,
            "email": supplier.email,
            "phone": supplier.phone,
            "contact_person": supplier.contact_person,
            "rating": 4.5,
            "on_time_delivery_rate": 0.95,
            "performance_score": 85.0,
            "active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        suppliers_db[supplier_id] = supplier_data
        
        return APIResponse(
            success=True,
            message="Supplier registered successfully",
            data=supplier_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/suppliers/all", response_model=APIResponse)
async def get_all_suppliers():
    """Get all registered suppliers"""
    try:
        suppliers = list(suppliers_db.values())
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(suppliers)} suppliers",
            data={
                "suppliers": suppliers,
                "total": len(suppliers)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suppliers/purchase-order", response_model=APIResponse)
async def create_purchase_order(po: PurchaseOrder):
    """Create a purchase order"""
    try:
        po_id = f"po_{uuid.uuid4().hex[:12]}"
        
        po_data = {
            "id": po_id,
            "supplier_id": po.supplier_id,
            "supplier_name": po.supplier_name,
            "line_items": [
                {
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price,
                    "delivery_date": item.delivery_date.isoformat()
                }
                for item in po.line_items
            ],
            "total_amount": po.total_amount,
            "status": "pending",
            "order_date": po.order_date.isoformat(),
            "expected_delivery_date": po.expected_delivery_date.isoformat(),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        purchase_orders_db[po_id] = po_data
        
        return APIResponse(
            success=True,
            message="Purchase order created successfully",
            data=po_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/suppliers/purchase-order/{po_id}/status", response_model=APIResponse)
async def update_purchase_order_status(po_id: str, status: str):
    """Update purchase order status"""
    try:
        if po_id not in purchase_orders_db:
            raise ValueError("Purchase order not found")
        
        valid_statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        
        po = purchase_orders_db[po_id]
        po["status"] = status
        po["updated_at"] = datetime.utcnow().isoformat()
        
        if status == "delivered":
            po["actual_delivery_date"] = date.today().isoformat()
        
        return APIResponse(
            success=True,
            message=f"Purchase order status updated to {status}",
            data=po
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/suppliers/{supplier_id}/forecast", response_model=APIResponse)
async def get_supplier_demand_forecast(supplier_id: str):
    """Get demand forecast for supplier products"""
    try:
        if supplier_id not in suppliers_db:
            raise ValueError("Supplier not found")
        
        supplier = suppliers_db[supplier_id]
        
        # Generate mock forecast for supplier's category
        forecasts = []
        for i in range(5):  # 5 products
            forecast = {
                "product_id": f"prod_{i}",
                "product_name": f"Product {i+1}",
                "category": supplier["category"],
                "next_7_days": round(100 + (i * 20), 2),
                "next_14_days": round(200 + (i * 40), 2),
                "next_30_days": round(500 + (i * 100), 2),
                "trend": "stable"
            }
            forecasts.append(forecast)
        
        return APIResponse(
            success=True,
            message="Supplier demand forecast retrieved",
            data={
                "supplier_id": supplier_id,
                "supplier_name": supplier["name"],
                "forecasts": forecasts
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/suppliers/{supplier_id}/analytics", response_model=APIResponse)
async def get_supplier_analytics(supplier_id: str):
    """Get supplier performance analytics"""
    try:
        if supplier_id not in suppliers_db:
            raise ValueError("Supplier not found")
        
        supplier = suppliers_db[supplier_id]
        
        # Mock analytics
        analytics = {
            "supplier_id": supplier_id,
            "supplier_name": supplier["name"],
            "total_orders": 45,
            "completed_orders": 42,
            "pending_orders": 3,
            "on_time_deliveries": 40,
            "on_time_delivery_rate": 0.95,
            "average_rating": supplier["rating"],
            "quality_score": 88.5,
            "reliability_score": 92.0,
            "overall_performance": 90.25,
            "calculated_at": datetime.utcnow().isoformat()
        }
        
        return APIResponse(
            success=True,
            message="Supplier analytics retrieved",
            data=analytics
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== INVENTORY MONITORING ENDPOINTS ====================

@router.post("/inventory/alert", response_model=APIResponse)
async def create_inventory_alert(alert: InventoryAlert):
    """Create inventory stock alert"""
    try:
        alert_id = f"alrt_{uuid.uuid4().hex[:12]}"
        
        alert_data = {
            "id": alert_id,
            "product_name": alert.product_name,
            "current_stock": alert.current_stock,
            "threshold_level": alert.threshold_level,
            "days_of_supply": alert.days_of_supply,
            "severity": alert.severity.value,
            "status": "active",
            "auto_po_generated": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Auto-generate PO for critical stock
        if alert.severity == AlertSeverity.CRITICAL:
            alert_data["auto_po_generated"] = True
            alert_data["auto_po_id"] = f"po_{uuid.uuid4().hex[:12]}"
        
        inventory_alerts_db[alert_id] = alert_data
        
        return APIResponse(
            success=True,
            message="Inventory alert created successfully",
            data=alert_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/inventory/alert/{alert_id}/acknowledge", response_model=APIResponse)
async def acknowledge_alert(alert_id: str):
    """Acknowledge an inventory alert"""
    try:
        if alert_id not in inventory_alerts_db:
            raise ValueError("Alert not found")
        
        alert = inventory_alerts_db[alert_id]
        alert["status"] = "acknowledged"
        alert["acknowledged_at"] = datetime.utcnow().isoformat()
        
        return APIResponse(
            success=True,
            message="Alert acknowledged",
            data=alert
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/inventory/alert/{alert_id}/resolve", response_model=APIResponse)
async def resolve_alert(alert_id: str):
    """Resolve an inventory alert"""
    try:
        if alert_id not in inventory_alerts_db:
            raise ValueError("Alert not found")
        
        alert = inventory_alerts_db[alert_id]
        alert["status"] = "resolved"
        alert["resolved_at"] = datetime.utcnow().isoformat()
        
        return APIResponse(
            success=True,
            message="Alert resolved",
            data=alert
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/inventory/status", response_model=APIResponse)
async def get_inventory_status():
    """Get current inventory status across all products"""
    try:
        # Mock inventory levels
        products = [
            {"product_name": "Milk", "current_stock": 150.0, "minimum_threshold": 100.0, "daily_consumption": 50.0},
            {"product_name": "Bread", "current_stock": 200.0, "minimum_threshold": 100.0, "daily_consumption": 80.0},
            {"product_name": "Butter", "current_stock": 50.0, "minimum_threshold": 30.0, "daily_consumption": 10.0},
            {"product_name": "Paneer", "current_stock": 75.0, "minimum_threshold": 50.0, "daily_consumption": 15.0},
            {"product_name": "Curd", "current_stock": 120.0, "minimum_threshold": 80.0, "daily_consumption": 30.0},
        ]
        
        inventory_levels = []
        critical_count = 0
        warning_count = 0
        safe_count = 0
        
        for product in products:
            days_of_supply = product["current_stock"] / product["daily_consumption"] if product["daily_consumption"] > 0 else 0
            
            level = {
                "product_name": product["product_name"],
                "current_stock": product["current_stock"],
                "minimum_threshold": product["minimum_threshold"],
                "daily_consumption": product["daily_consumption"],
                "days_of_supply": round(days_of_supply, 2),
                "last_updated": datetime.utcnow().isoformat()
            }
            
            if days_of_supply < 3:
                critical_count += 1
            elif days_of_supply < 7:
                warning_count += 1
            else:
                safe_count += 1
            
            inventory_levels.append(level)
        
        status = {
            "timestamp": datetime.utcnow().isoformat(),
            "products": inventory_levels,
            "total_products": len(inventory_levels),
            "critical_count": critical_count,
            "warning_count": warning_count,
            "safe_count": safe_count,
            "active_alerts": len(inventory_alerts_db),
            "total_stock_value": sum(p["current_stock"] * 100 for p in products)  # Mock pricing
        }
        
        return APIResponse(
            success=True,
            message="Inventory status retrieved",
            data=status
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory/active-alerts", response_model=APIResponse)
async def get_active_alerts():
    """Get all active inventory alerts"""
    try:
        active_alerts = [
            alert for alert in inventory_alerts_db.values()
            if alert["status"] == "active"
        ]
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(active_alerts)} active alerts",
            data={
                "alerts": active_alerts,
                "total": len(active_alerts)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== HEALTH CHECK ====================

@router.get("/critical-systems/health", response_model=APIResponse)
async def critical_systems_health():
    """Health check for all critical systems"""
    try:
        health_status = {
            "payment_system": {"status": "operational", "endpoints": 5},
            "calendar_system": {"status": "operational", "endpoints": 3},
            "voice_order_system": {"status": "operational", "endpoints": 3},
            "ocr_system": {"status": "operational", "endpoints": 3},
            "forecasting_system": {"status": "operational", "endpoints": 3},
            "supplier_system": {"status": "operational", "endpoints": 5},
            "inventory_system": {"status": "operational", "endpoints": 5}
        }
        
        return APIResponse(
            success=True,
            message="All critical systems operational",
            data=health_status
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include all defined routes in the app
app.include_router(router)
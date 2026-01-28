"""
EarlyBird Critical Systems - Database Models
Defines Pydantic models and MongoDB schemas for all 7 critical systems:
1. Payment System
2. Calendar System
3. Voice Order System
4. OCR Processor
5. Demand Forecasting
6. Supplier Portal
7. Inventory Monitoring
"""

from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum
import uuid

# ==================== PAYMENT SYSTEM MODELS ====================

class PaymentMethod(str, Enum):
    RAZORPAY = "razorpay"
    PAYUMONEY = "payumoney"
    UPI = "upi"
    WALLET = "wallet"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentLinkCreate(BaseModel):
    customer_id: str
    amount: float
    order_id: str
    method: PaymentMethod
    description: Optional[str] = None
    callback_url: Optional[str] = None

class PaymentLinkResponse(BaseModel):
    id: str
    customer_id: str
    amount: float
    order_id: str
    method: PaymentMethod
    payment_link: str
    status: PaymentStatus = PaymentStatus.PENDING
    created_at: datetime
    expires_at: datetime
    metadata: Dict[str, Any] = {}

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    customer_id: str
    order_id: str
    amount: float
    method: PaymentMethod
    status: PaymentStatus
    transaction_id: Optional[str] = None  # From payment gateway
    reference_id: Optional[str] = None  # Internal reference
    gateway_response: Dict[str, Any] = {}
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    refund_id: Optional[str] = None
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None

class WalletTransaction(BaseModel):
    id: str = Field(default_factory=lambda: f"wallet_{uuid.uuid4().hex[:12]}")
    customer_id: str
    amount: float
    transaction_type: str  # 'debit', 'credit', 'refund'
    reason: str  # 'payment', 'refund', 'bonus', 'recharge'
    balance_before: float
    balance_after: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Wallet(BaseModel):
    customer_id: str
    balance: float = 0.0
    total_credited: float = 0.0
    total_debited: float = 0.0
    transaction_history: List[WalletTransaction] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== CALENDAR SYSTEM MODELS ====================

class EventType(str, Enum):
    ORDER = "order"
    DELIVERY = "delivery"
    SUBSCRIPTION = "subscription"
    HOLIDAY = "holiday"

class CalendarEvent(BaseModel):
    id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    customer_id: str
    event_date: date
    event_type: EventType
    count: int  # Number of orders/deliveries
    description: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CalendarHeatmapData(BaseModel):
    date: date
    event_count: int
    orders: int = 0
    deliveries: int = 0
    subscriptions: int = 0
    heat_level: int  # 0-5 (white to darkest green)

class MonthlyStats(BaseModel):
    year: int
    month: int
    total_orders: int = 0
    total_deliveries: int = 0
    total_subscriptions: int = 0
    busiest_day: Optional[date] = None
    busiest_day_count: int = 0
    average_daily_orders: float = 0.0
    peak_hour: Optional[int] = None

# ==================== VOICE ORDER SYSTEM MODELS ====================

class VoiceTranscript(BaseModel):
    id: str = Field(default_factory=lambda: f"vtr_{uuid.uuid4().hex[:12]}")
    customer_id: str
    language: str  # 'en', 'hi', 'ta', etc.
    transcript: str
    confidence: float  # 0-1
    duration: float  # seconds
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ParsedVoiceItem(BaseModel):
    product_name: str
    quantity: int
    unit: str  # 'kg', 'liter', 'pieces', etc.
    confidence: float  # 0-1
    price_estimate: float = 0.0

class VoiceOrder(BaseModel):
    id: str = Field(default_factory=lambda: f"vord_{uuid.uuid4().hex[:12]}")
    customer_id: str
    transcript_id: str
    language: str
    parsed_items: List[ParsedVoiceItem]
    total_items: int
    estimated_total: float
    confidence_score: float  # Average confidence
    confirmed: bool = False
    created_order_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VoiceOrderHistory(BaseModel):
    customer_id: str
    orders: List[VoiceOrder] = []
    total_voice_orders: int = 0
    success_rate: float = 0.0  # Percentage of confirmed orders

# ==================== OCR SYSTEM MODELS ====================

class OCRUpload(BaseModel):
    id: str = Field(default_factory=lambda: f"ocr_{uuid.uuid4().hex[:12]}")
    customer_id: str
    filename: str
    file_size: int
    mime_type: str
    file_path: str
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow)

class ParsedOCRItem(BaseModel):
    product_name: str
    quantity: int
    unit: str
    confidence: float  # 0-1
    price_estimate: float = 0.0
    notes: Optional[str] = None

class OCROrder(BaseModel):
    id: str = Field(default_factory=lambda: f"oord_{uuid.uuid4().hex[:12]}")
    customer_id: str
    image_id: str
    extracted_text: str
    parsed_items: List[ParsedOCRItem]
    total_items: int
    estimated_total: float
    confidence_score: float
    confirmed: bool = False
    created_order_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OCROrderHistory(BaseModel):
    customer_id: str
    orders: List[OCROrder] = []
    total_ocr_orders: int = 0
    success_rate: float = 0.0

# ==================== DEMAND FORECASTING MODELS ====================

class ForecastTrendType(str, Enum):
    INCREASING = "increasing"
    DECREASING = "decreasing"
    STABLE = "stable"

class StockRiskLevel(str, Enum):
    CRITICAL = "critical"  # < 3 days
    WARNING = "warning"    # 3-7 days
    SAFE = "safe"          # 7+ days

class DailyForecast(BaseModel):
    date: date
    product_name: str
    predicted_quantity: float
    confidence: float  # 0-1
    trend: ForecastTrendType
    seasonal_factor: float
    lower_bound: float
    upper_bound: float

class DemandForecast(BaseModel):
    id: str = Field(default_factory=lambda: f"fcst_{uuid.uuid4().hex[:12]}")
    product_name: str
    forecast_period: int  # days
    daily_forecasts: List[DailyForecast]
    total_predicted: float
    average_daily: float
    trend: ForecastTrendType
    confidence: float  # Average confidence
    stock_risk: StockRiskLevel
    current_stock: float
    reorder_point: float
    safety_stock: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    valid_until: datetime
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class ForecastAccuracy(BaseModel):
    forecast_id: str
    product_name: str
    mape: float  # Mean Absolute Percentage Error
    rmse: float  # Root Mean Squared Error
    mae: float   # Mean Absolute Error
    historical_actual: List[float]
    historical_predicted: List[float]
    accuracy_percentage: float  # 100 - MAPE
    calculated_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== SUPPLIER SYSTEM MODELS ====================

class PurchaseOrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class POLineItem(BaseModel):
    product_name: str
    quantity: float
    unit_price: float
    total_price: float
    delivery_date: date

class PurchaseOrder(BaseModel):
    id: str = Field(default_factory=lambda: f"po_{uuid.uuid4().hex[:12]}")
    supplier_id: str
    supplier_name: str
    line_items: List[POLineItem]
    total_amount: float
    status: PurchaseOrderStatus = PurchaseOrderStatus.PENDING
    order_date: date
    expected_delivery_date: date
    actual_delivery_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Supplier(BaseModel):
    id: str = Field(default_factory=lambda: f"sup_{uuid.uuid4().hex[:12]}")
    name: str
    category: str  # 'dairy', 'bakery', 'vegetables', etc.
    location: str
    email: EmailStr
    phone: str
    contact_person: Optional[str] = None
    rating: float = 4.5  # 0-5
    on_time_delivery_rate: float = 0.95  # 0-1
    performance_score: float = 0.0  # 0-100
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}

class SupplierAnalytics(BaseModel):
    supplier_id: str
    supplier_name: str
    total_orders: int
    completed_orders: int
    pending_orders: int
    on_time_deliveries: int
    on_time_delivery_rate: float
    average_rating: float
    quality_score: float
    reliability_score: float
    overall_performance: float  # 0-100
    calculated_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== INVENTORY MONITORING MODELS ====================

class AlertSeverity(str, Enum):
    CRITICAL = "critical"  # < 3 days of supply
    WARNING = "warning"    # 3-7 days of supply
    SAFE = "safe"          # 7+ days of supply

class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"

class InventoryAlert(BaseModel):
    id: str = Field(default_factory=lambda: f"alrt_{uuid.uuid4().hex[:12]}")
    product_name: str
    current_stock: float
    threshold_level: float
    days_of_supply: float
    severity: AlertSeverity
    status: AlertStatus = AlertStatus.ACTIVE
    auto_po_generated: bool = False
    auto_po_id: Optional[str] = None
    supplier_notified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None

class InventoryTransaction(BaseModel):
    id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    product_name: str
    transaction_type: str  # 'add', 'subtract', 'set'
    quantity: float
    previous_stock: float
    new_stock: float
    reason: str  # 'purchase_order', 'delivery', 'adjustment', 'sale'
    reference_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

class InventoryLevel(BaseModel):
    product_name: str
    current_stock: float
    minimum_threshold: float
    reorder_point: float
    safety_stock: float
    daily_consumption: float
    days_of_supply: float
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    last_restocking_date: Optional[date] = None
    next_planned_restock: Optional[date] = None

class InventoryStatus(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    products: List[InventoryLevel]
    total_products: int
    critical_count: int
    warning_count: int
    safe_count: int
    active_alerts: int
    total_stock_value: float

# ==================== SHARED MODELS ====================

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class PaginatedResponse(BaseModel):
    success: bool
    data: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    total_pages: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)

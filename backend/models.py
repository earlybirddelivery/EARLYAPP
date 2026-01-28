from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum

class UserRole(str, Enum):
    CUSTOMER = "customer"
    DELIVERY_BOY = "delivery_boy"
    SUPPLIER = "supplier"
    MARKETING_STAFF = "marketing_staff"
    ADMIN = "admin"

class SubscriptionPattern(str, Enum):
    DAILY = "daily"
    ALTERNATE_DAYS = "alternate_days"
    WEEKLY = "weekly"
    CUSTOM_DAYS = "custom_days"

class DeliveryStatus(str, Enum):
    PENDING = "pending"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    NOT_DELIVERED = "not_delivered"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class OrderType(str, Enum):
    SUBSCRIPTION = "subscription"
    ONE_TIME = "one_time"

# Base User Model
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    phone: Optional[str] = None
    name: str
    role: UserRole
    customer_v2_id: Optional[str] = None  # STEP 21: Link to db.customers_v2 for delivery
    is_active: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    phone: Optional[str] = None
    name: str
    password: str
    role: UserRole
    customer_v2_id: Optional[str] = None  # STEP 21: Optional - can be created with customer

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

# Address Model
class Address(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    label: str
    address_line1: str
    address_line2: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    state: str
    pincode: str
    latitude: float
    longitude: float
    is_default: bool = False

class AddressCreate(BaseModel):
    label: str
    address_line1: str
    address_line2: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    state: str
    pincode: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool = False

# Family Profile
class FamilyMember(BaseModel):
    name: str
    age: int
    gender: str
    dietary_preferences: List[str] = []

class FamilyProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    members: List[FamilyMember]
    household_size: int

class FamilyProfileCreate(BaseModel):
    members: List[FamilyMember]

# Product Models
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    category: str
    unit: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    category: str
    unit: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None

# Subscription Models
class SubscriptionOverride(BaseModel):
    date: date
    quantity: int

class SubscriptionPause(BaseModel):
    start_date: date
    end_date: date
    reason: Optional[str] = None

class Subscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    product_id: str
    pattern: SubscriptionPattern
    quantity: int
    custom_days: Optional[List[int]] = None  # [0-6] for Mon-Sun
    start_date: date
    end_date: Optional[date] = None
    overrides: List[SubscriptionOverride] = []
    pauses: List[SubscriptionPause] = []
    is_active: bool = True
    created_at: datetime
    address_id: str

class SubscriptionCreate(BaseModel):
    product_id: str
    pattern: SubscriptionPattern
    quantity: int
    custom_days: Optional[List[int]] = None
    start_date: date
    end_date: Optional[date] = None
    address_id: str

class SubscriptionUpdate(BaseModel):
    quantity: Optional[int] = None
    pattern: Optional[SubscriptionPattern] = None
    custom_days: Optional[List[int]] = None
    is_active: Optional[bool] = None

class SubscriptionOverrideCreate(BaseModel):
    date: date
    quantity: int

class SubscriptionPauseCreate(BaseModel):
    start_date: date
    end_date: date
    reason: Optional[str] = None

# Order Models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit: str
    price: float
    total: float

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    customer_id: str  # PHASE 0.4: Link to customer_v2
    order_type: OrderType
    subscription_id: Optional[str] = None
    items: List[OrderItem]
    total_amount: float
    delivery_date: date
    address_id: str
    address: Dict[str, Any]
    status: DeliveryStatus
    delivery_boy_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    delivered_at: Optional[datetime] = None
    billed: bool = False  # PHASE 0.4.4: Billing flag
    delivery_confirmed: bool = False  # PHASE 0.4.3: Delivery confirmation flag
    billed_at: Optional[datetime] = None  # PHASE 0.4.4: When billed
    billed_month: Optional[str] = None  # PHASE 0.4.4: Month billed for (YYYY-MM)

class OrderCreate(BaseModel):
    items: List[OrderItem]
    delivery_date: date
    address_id: str
    notes: Optional[str] = None

# Route Models
class RouteStop(BaseModel):
    order_id: str
    user_id: str
    customer_name: str
    address: str
    latitude: float
    longitude: float
    items: List[OrderItem]
    sequence: int
    status: DeliveryStatus
    notes: Optional[str] = None

class Route(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    delivery_boy_id: str
    delivery_boy_name: str
    date: date
    stops: List[RouteStop]
    total_distance_km: float
    estimated_duration_mins: int
    created_at: datetime
    status: str  # planned, in_progress, completed

class DeliveryUpdate(BaseModel):
    order_id: str
    status: DeliveryStatus
    notes: Optional[str] = None
    cash_collected: Optional[float] = None

# Supplier Models
class Supplier(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    phone: str
    address: str
    products_supplied: List[str]  # product IDs
    payment_terms: str
    is_active: bool = True

class SupplierCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    address: str
    products_supplied: List[str]
    payment_terms: str

class ProcurementOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    supplier_id: str
    date: date
    items: List[Dict[str, Any]]
    total_amount: float
    status: str  # pending, confirmed, delivered, cancelled
    created_at: datetime

class ProcurementOrderCreate(BaseModel):
    supplier_id: str
    date: date
    items: List[Dict[str, Any]]

# Marketing Staff Models
class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    marketing_staff_id: str
    name: str
    phone: str
    address: str
    area: str
    status: str  # contacted, interested, converted, rejected
    notes: Optional[str] = None
    created_at: datetime
    converted_to_customer_id: Optional[str] = None

class LeadCreate(BaseModel):
    name: str
    phone: str
    address: str
    area: str
    notes: Optional[str] = None

class Commission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    marketing_staff_id: str
    customer_id: str
    amount: float
    period: str
    status: str  # pending, paid
    created_at: datetime

# Inventory Models
class Inventory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    product_id: str
    date: date
    opening_stock: float
    received: float
    delivered: float
    returned: float
    wastage: float
    closing_stock: float

class InventoryUpdate(BaseModel):
    product_id: str
    date: date
    received: Optional[float] = None
    delivered: Optional[float] = None
    returned: Optional[float] = None
    wastage: Optional[float] = None

# Payment Models
class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    order_id: Optional[str] = None
    amount: float
    payment_method: str
    status: PaymentStatus
    transaction_id: Optional[str] = None
    created_at: datetime

class PaymentCreate(BaseModel):
    order_id: Optional[str] = None
    amount: float
    payment_method: str

# AI Recommendation Models
class AIRecommendationRequest(BaseModel):
    family_profile_id: Optional[str] = None
    recommendation_type: str  # grocery, meal_plan, milk_requirement

class AIRecommendation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    recommendations: List[str]
    reasoning: str

# Analytics Models
class DashboardStats(BaseModel):
    total_customers: int
    active_subscriptions: int
    today_deliveries: int
    pending_deliveries: int
    total_revenue: float
    monthly_revenue: float

class DeliveryBoyStats(BaseModel):
    delivery_boy_id: str
    name: str
    today_deliveries: int
    completed: int
    pending: int
    cash_collected: float

# PHASE 4B.2: STAFF WALLET MODELS
# ========================================

class BonusType(str, Enum):
    ON_TIME = "on_time"  # 5% bonus if >95% on-time
    RATING = "rating"  # ₹10 per star rating >4.5
    COMPLETION = "completion"  # Bonus for completing targets
    PERFORMANCE = "performance"  # Performance-based bonus

class DeductionType(str, Enum):
    COMPLAINT = "complaint"  # -₹50 per complaint
    DAMAGE = "damage"  # Damage to goods
    LATE_RETURN = "late_return"  # Late return of equipment
    DISCIPLINARY = "disciplinary"  # Disciplinary action

class PayoutStatus(str, Enum):
    REQUESTED = "requested"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class PaymentMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    UPI = "upi"
    WALLET = "wallet"
    CASH = "cash"

# Daily Earnings Record
class DailyEarnings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    staff_id: str
    date: date
    deliveries_completed: int
    delivery_amount: float  # Base amount for deliveries
    bonus_amount: float  # Total bonuses earned
    deductions_amount: float  # Total deductions
    net_earnings: float  # delivery_amount + bonus - deductions
    rating: float  # Average rating for the day
    on_time_percentage: float  # % of on-time deliveries
    complaints: int
    created_at: datetime
    updated_at: datetime

# Bonus Record
class Bonus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    staff_id: str
    earnings_id: str  # Links to DailyEarnings
    bonus_type: BonusType
    amount: float
    reason: str
    created_at: datetime

# Deduction Record
class Deduction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    staff_id: str
    earnings_id: str  # Links to DailyEarnings
    deduction_type: DeductionType
    amount: float
    reason: str
    reference_id: Optional[str] = None  # Complaint ID, etc.
    created_at: datetime

# Monthly Statement
class MonthlyStatement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    staff_id: str
    month: str  # YYYY-MM
    total_deliveries: int
    base_earnings: float
    total_bonuses: float
    total_deductions: float
    net_earnings: float
    average_rating: float
    on_time_percentage: float
    complaints_count: int
    created_at: datetime

# Payout Request
class PayoutRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    staff_id: str
    amount: float
    payment_method: PaymentMethod
    status: PayoutStatus
    bank_details: Optional[Dict[str, Any]] = None
    upi_id: Optional[str] = None
    notes: Optional[str] = None
    requested_at: datetime
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None  # Admin ID
    processed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    reference_id: Optional[str] = None  # Payment gateway reference

# Staff Wallet Summary
class StaffWalletSummary(BaseModel):
    staff_id: str
    name: str
    phone: str
    today_earnings: float
    month_earnings: float
    pending_payout: float
    lifetime_earnings: float
    average_rating: float
    on_time_percentage: float
    total_deliveries: int
    pending_requests: int
    last_payout_date: Optional[date] = None

# Request/Response Models
class DailyEarningsCreate(BaseModel):
    staff_id: str
    date: date
    deliveries_completed: int
    delivery_amount: float
    rating: float
    on_time_percentage: float
    complaints: int

class PayoutRequestCreate(BaseModel):
    amount: float
    payment_method: PaymentMethod
    bank_details: Optional[Dict[str, Any]] = None
    upi_id: Optional[str] = None
    notes: Optional[str] = None

class PayoutRequestUpdate(BaseModel):
    status: PayoutStatus
    approved_by: Optional[str] = None
    failure_reason: Optional[str] = None
    reference_id: Optional[str] = None

class BonusApply(BaseModel):
    staff_id: str
    earnings_id: str
    bonus_type: BonusType
    amount: float
    reason: str

class DeductionApply(BaseModel):
    staff_id: str
    earnings_id: str
    deduction_type: DeductionType
    amount: float
    reason: str
    reference_id: Optional[str] = None
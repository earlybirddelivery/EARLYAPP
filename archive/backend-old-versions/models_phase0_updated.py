from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import List, Optional, Dict
from datetime import date
from enum import Enum

# Enums
class UserRole(str, Enum):
    MARKETING_STAFF = "marketing_staff"
    ADMIN = "admin"

class CustomerStatus(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"

class SubscriptionMode(str, Enum):
    FIXED_DAILY = "fixed_daily"
    WEEKLY_PATTERN = "weekly_pattern"
    DAY_BY_DAY = "day_by_day"
    IRREGULAR = "irregular"
    ONE_TIME = "one_time"

class SubscriptionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"

class DeliveryShift(str, Enum):
    MORNING = "morning"
    EVENING = "evening"
    BOTH = "both"  # Customer gets delivery in both shifts

# Location Model
class Location(BaseModel):
    lat: float
    lng: float
    accuracy_meters: Optional[float] = None

# Product Models
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    unit: str  # e.g., "Liter", "Kg"
    default_price: Optional[float] = None
    price: Optional[float] = None  # Alias for backward compatibility

    def get_price(self) -> float:
        """Get price from either field"""
        return self.default_price if self.default_price is not None else (self.price or 0.0)

class ProductCreate(BaseModel):
    name: str
    unit: str
    default_price: Optional[float] = None
    price: Optional[float] = None  # Alias for backward compatibility

# Customer Models
class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    address: str
    area: str
    map_link: Optional[str] = None
    location: Optional[Location] = None
    status: CustomerStatus = CustomerStatus.TRIAL
    trial_start_date: Optional[str] = None  # YYYY-MM-DD format
    notes: Optional[str] = None
    house_image_url: Optional[str] = None
    marketing_boy: Optional[str] = None
    marketing_boy_id: Optional[str] = None
    delivery_boy_id: Optional[str] = None
    previous_balance: Optional[float] = 0  # Carryforward balance from previous month
    custom_product_prices: Optional[Dict[str, float]] = {}  # {product_id: custom_price}

class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: str
    area: str
    map_link: Optional[str] = None
    location: Optional[Location] = None
    status: CustomerStatus = CustomerStatus.TRIAL
    trial_start_date: Optional[str] = None
    notes: Optional[str] = None
    house_image_url: Optional[str] = None
    marketing_boy: Optional[str] = None
    marketing_boy_id: Optional[str] = None
    delivery_boy_id: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    map_link: Optional[str] = None
    location: Optional[Location] = None
    status: Optional[CustomerStatus] = None
    trial_start_date: Optional[str] = None
    notes: Optional[str] = None
    house_image_url: Optional[str] = None
    marketing_boy: Optional[str] = None
    marketing_boy_id: Optional[str] = None
    delivery_boy_id: Optional[str] = None
    previous_balance: Optional[float] = None
    custom_product_prices: Optional[Dict[str, float]] = None

class CustomerConfirm(BaseModel):
    customer_id: str

# Subscription Models
class DayOverride(BaseModel):
    date: str  # YYYY-MM-DD format
    quantity: float
    shift: Optional[str] = None  # Specific shift override

class IrregularDelivery(BaseModel):
    date: str  # YYYY-MM-DD format
    quantity: float
    shift: Optional[str] = None  # Specific shift for this irregular delivery
    note: Optional[str] = None

class ShiftOverride(BaseModel):
    date: str  # YYYY-MM-DD format
    shift: str  # Change to specific shift for this date

class PauseInterval(BaseModel):
    start: str  # YYYY-MM-DD format
    end: Optional[str] = None  # YYYY-MM-DD format, None = indefinite pause

class Subscription(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str
    customer_id: str = Field(alias="customerId")
    product_id: Optional[str] = Field(default=None, alias="productId")
    price_per_unit: Optional[float] = None  # Optional during draft
    mode: SubscriptionMode = SubscriptionMode.FIXED_DAILY
    default_qty: float = 0
    shift: str = "morning"  # Default shift: morning, evening, or both
    weekly_pattern: Optional[List[int]] = None  # [0-6] for Mon-Sun, e.g., [0,2,4] for Mon, Wed, Fri
    day_overrides: List[DayOverride] = []
    irregular_list: List[IrregularDelivery] = []
    shift_overrides: List[ShiftOverride] = []  # Change shift for specific dates
    pause_intervals: List[PauseInterval] = []
    stop_date: Optional[str] = None  # YYYY-MM-DD format
    status: SubscriptionStatus = SubscriptionStatus.DRAFT
    auto_start: bool = False  # Must be TRUE + status="active" for deliveries

class SubscriptionCreate(BaseModel):
    customer_id: str
    product_id: Optional[str] = None
    price_per_unit: Optional[float] = None
    mode: SubscriptionMode = SubscriptionMode.FIXED_DAILY
    default_qty: float = 0
    shift: str = "morning"  # morning, evening, or both
    weekly_pattern: Optional[List[int]] = None
    day_overrides: List[DayOverride] = []
    irregular_list: List[IrregularDelivery] = []
    shift_overrides: List[ShiftOverride] = []
    pause_intervals: List[PauseInterval] = []
    stop_date: Optional[str] = None
    status: SubscriptionStatus = SubscriptionStatus.DRAFT
    auto_start: bool = False

class SubscriptionUpdate(BaseModel):
    product_id: Optional[str] = None
    price_per_unit: Optional[float] = None
    mode: Optional[SubscriptionMode] = None
    default_qty: Optional[float] = None
    shift: Optional[str] = None
    weekly_pattern: Optional[List[int]] = None
    day_overrides: Optional[List[DayOverride]] = None
    irregular_list: Optional[List[IrregularDelivery]] = None
    pause_intervals: Optional[List[PauseInterval]] = None
    stop_date: Optional[str] = None
    status: Optional[SubscriptionStatus] = None
    auto_start: Optional[bool] = None

# Delivery Boy Models
class DeliveryBoy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    area_assigned: str

class DeliveryBoyCreate(BaseModel):
    name: str
    area_assigned: str

# Delivery List Item
class DeliveryListItem(BaseModel):
    serial: int
    customer_id: str
    customer_name: str
    phone: str
    address: str
    area: str
    product_id: Optional[str] = None
    product_name: str
    quantity: float
    price_per_unit: float
    shift: Optional[str] = "morning"  # morning, evening, or both
    notes: Optional[str] = None
    status: str
    map_link: Optional[str] = None
    subscription_id: Optional[str] = None
    delivery_boy_id: Optional[str] = None
    delivery_boy_name: Optional[str] = None

# Dashboard Stats
class TopPerformer(BaseModel):
    name: str
    liters: float

class DashboardStats(BaseModel):
    total_customers: int
    trial_customers: int
    active_customers: int
    total_subscriptions: int
    liters_by_area: Dict[str, float]
    liters_by_delivery_boy: Optional[Dict[str, float]] = {}
    liters_by_marketing_boy: Optional[Dict[str, float]] = {}
    morning_deliveries: Optional[float] = 0
    evening_deliveries: Optional[float] = 0
    both_shift_deliveries: Optional[float] = 0
    top_delivery_boy: Optional[TopPerformer] = None
    top_marketing_boy: Optional[TopPerformer] = None

# Excel Import Models
class CustomerImportRow(BaseModel):
    name: str
    phone: str
    area: str
    address: str
    map_link: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    default_daily_qty: float
    subscription_type: str  # "daily", "weekly", etc.
    notes: Optional[str] = None

class ImportPreview(BaseModel):
    total_rows: int
    valid_rows: int
    errors: List[Dict]
    preview_data: List[Dict]

class ImportResult(BaseModel):
    success: bool
    imported_count: int
    failed_count: int
    errors: List[Dict]

# Auth Models
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict

# ==================== BILLING MODELS ====================

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    customer_id: str
    month: str  # YYYY-MM format
    amount: float
    payment_date: str  # YYYY-MM-DD format
    payment_method: str  # Cash, UPI, QR
    notes: Optional[str] = None
    created_at: str
    created_by: str  # User ID who recorded the payment

class PaymentTransactionCreate(BaseModel):
    customer_id: str
    month: str
    amount: float
    payment_date: str
    payment_method: str = "Cash"
    notes: Optional[str] = None

class MonthlyBillSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    customer_id: str
    customer_name: str
    phone: str
    area: str
    sub_area: Optional[str] = None
    delivery_boy: Optional[str] = None
    marketing_boy: Optional[str] = None
    month: str  # YYYY-MM format
    year: int
    products_summary: Dict[str, Dict]  # {product_id: {name, total_qty, total_amount, daily_data}}
    total_bill_amount: float
    amount_paid: float
    previous_balance: float
    current_balance: float
    payment_status: str  # Paid, Partial, Unpaid
    payments: List[Dict]  # List of payment transactions
    generated_at: str

class SystemSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    qr_code_url: Optional[str] = None
    upi_id: Optional[str] = "BHARATPE09905869536@yesbankltd"
    business_name: str = "Earlybird Delivery Services"
    business_phone: Optional[str] = None
    whatsapp_template_telugu: Optional[str] = None
    whatsapp_template_english: Optional[str] = None

class SystemSettingsUpdate(BaseModel):
    qr_code_url: Optional[str] = None
    upi_id: Optional[str] = None
    business_name: Optional[str] = None
    business_phone: Optional[str] = None
    whatsapp_template_telugu: Optional[str] = None
    whatsapp_template_english: Optional[str] = None

class MonthlyBillingFilters(BaseModel):
    month: str  # YYYY-MM format
    product_ids: Optional[List[str]] = None  # Filter by products
    areas: Optional[List[str]] = None
    sub_areas: Optional[List[str]] = None
    delivery_boy_ids: Optional[List[str]] = None
    marketing_boy_ids: Optional[List[str]] = None
    payment_status: Optional[str] = None  # Paid, Partial, Unpaid, All

class DayQuantityUpdate(BaseModel):
    customer_id: str
    product_id: str
    date: str  # YYYY-MM-DD
    quantity: float
    shift: Optional[str] = "morning"

class WhatsAppMessageData(BaseModel):
    customer_name: str
    month_bill: float
    amount_paid: float
    previous_balance: float
    total_liters: float
    current_balance: float
    qr_url: Optional[str] = None
    upi_id: str

    access_token: str
    token_type: str
    user: Dict

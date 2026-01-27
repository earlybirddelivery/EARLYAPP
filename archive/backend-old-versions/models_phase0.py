from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional, Dict
from datetime import date
from enum import Enum

# Enums
class UserRole(str, Enum):
    MARKETING_STAFF = "marketing_staff"
    ADMIN = "admin"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"

# Customer Models
class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    address: str
    area: str
    map_link: Optional[str] = None
    notes: Optional[str] = None

class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: str
    area: str
    map_link: Optional[str] = None
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    map_link: Optional[str] = None
    notes: Optional[str] = None

# Subscription Models
class DayOverride(BaseModel):
    date: str  # YYYY-MM-DD format
    quantity: float

class Subscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    customer_id: str
    default_quantity: float  # liters per day
    day_overrides: List[DayOverride] = []  # specific date quantity changes
    pause_dates: List[str] = []  # list of dates in YYYY-MM-DD format
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE

class SubscriptionCreate(BaseModel):
    customer_id: str
    default_quantity: float
    day_overrides: List[DayOverride] = []
    pause_dates: List[str] = []
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE

class SubscriptionUpdate(BaseModel):
    default_quantity: Optional[float] = None
    day_overrides: Optional[List[DayOverride]] = None
    pause_dates: Optional[List[str]] = None
    status: Optional[SubscriptionStatus] = None

# Delivery Boy Models
class DeliveryBoy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    area_assigned: str

class DeliveryBoyCreate(BaseModel):
    name: str
    area_assigned: str

# Delivery Record Models (for billing tracking)
class DeliveryRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    customer_id: str
    delivery_date: str  # YYYY-MM-DD
    quantity: float
    delivery_boy_id: Optional[str] = None
    notes: Optional[str] = None

class DeliveryRecordCreate(BaseModel):
    customer_id: str
    delivery_date: str
    quantity: float
    delivery_boy_id: Optional[str] = None
    notes: Optional[str] = None

# Delivery List Item (for admin view)
class DeliveryListItem(BaseModel):
    serial: int
    customer_id: str
    customer_name: str
    phone: str
    address: str
    quantity: float
    notes: Optional[str] = None
    status: str  # "Active" or "Paused"
    map_link: Optional[str] = None
    area: str

# Dashboard Stats
class DashboardStats(BaseModel):
    total_customers: int
    total_active_subscriptions: int
    liters_by_area: Dict[str, float]

# Billing Models
class CustomerBill(BaseModel):
    customer_id: str
    customer_name: str
    phone: str
    address: str
    start_date: str
    end_date: str
    deliveries: List[Dict]  # list of {date, quantity}
    total_liters: float
    rate_per_liter: float
    total_amount: float

# Auth Models (keep minimal)
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict

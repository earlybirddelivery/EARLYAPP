"""
PHASE 0.4.5: Order Validation Framework
========================================

Comprehensive validators for orders, customers, billing, and addresses.
Used to prevent data corruption and ensure data integrity.

Author: AI Agent
Date: January 27, 2026
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from database import db
import re

class OrderValidator:
    """Validators for order creation and updates"""
    
    @staticmethod
    async def validate_customer_exists(customer_id: str) -> bool:
        """Verify customer exists in customers_v2"""
        customer = await db.customers_v2.find_one({"id": customer_id})
        return customer is not None
    
    @staticmethod
    async def validate_user_id_matches(user_id: str, customer_id: str) -> bool:
        """Verify user_id matches customer's user_id"""
        customer = await db.customers_v2.find_one({"id": customer_id})
        if not customer:
            return False
        return customer.get("user_id") == user_id
    
    @staticmethod
    async def validate_items_not_empty(items: List[Dict]) -> bool:
        """Verify order has at least one item"""
        return len(items) > 0 and all(
            item.get("quantity", 0) > 0 and 
            item.get("price", 0) >= 0 
            for item in items
        )
    
    @staticmethod
    async def validate_address_exists(address_id: str, user_id: str) -> bool:
        """Verify address exists and belongs to user"""
        address = await db.addresses.find_one({
            "id": address_id,
            "user_id": user_id
        })
        return address is not None
    
    @staticmethod
    async def validate_address_valid(address: Dict[str, Any]) -> bool:
        """Verify address has required fields with valid values"""
        required_fields = ["address_line1", "city", "state", "pincode"]
        
        for field in required_fields:
            if not address.get(field) or not isinstance(address[field], str):
                return False
        
        # Validate pincode format (Indian pincode: 6 digits)
        pincode = address.get("pincode", "").strip()
        if not re.match(r"^\d{6}$", pincode):
            return False
        
        return True
    
    @staticmethod
    async def validate_delivery_date_valid(delivery_date: date) -> bool:
        """Verify delivery date is in future"""
        today = datetime.now().date()
        return delivery_date >= today
    
    @staticmethod
    async def validate_total_amount_positive(total_amount: float) -> bool:
        """Verify total amount is positive"""
        return total_amount > 0
    
    @staticmethod
    async def validate_payment_method_valid(payment_method: str) -> bool:
        """Verify payment method is supported"""
        valid_methods = [
            "CASH", "CARD", "UPI", "NETBANKING", 
            "WALLET", "PAYPAL", "GOOGLE_PAY", "APPLE_PAY"
        ]
        return payment_method in valid_methods
    
    @staticmethod
    async def validate_no_duplicate_pending_orders(customer_id: str, delivery_date: str) -> bool:
        """Prevent duplicate orders on same delivery date"""
        existing = await db.orders.find_one({
            "customer_id": customer_id,
            "delivery_date": delivery_date,
            "status": {"$in": ["PENDING", "OUT_FOR_DELIVERY"]}
        })
        return existing is None


class AddressValidator:
    """Validators for address data"""
    
    @staticmethod
    def validate_phone_format(phone: str) -> bool:
        """Validate Indian phone number (10 digits)"""
        phone_clean = phone.replace(" ", "").replace("-", "").replace("+91", "")
        return len(phone_clean) == 10 and phone_clean.isdigit()
    
    @staticmethod
    def validate_email_format(email: str) -> bool:
        """Validate email format"""
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_pincode_format(pincode: str) -> bool:
        """Validate Indian pincode (6 digits)"""
        return re.match(r"^\d{6}$", pincode) is not None
    
    @staticmethod
    def validate_latitude_longitude(lat: float, lng: float) -> bool:
        """Validate GPS coordinates"""
        return -90 <= lat <= 90 and -180 <= lng <= 180


class BillingValidator:
    """Validators for billing operations"""
    
    @staticmethod
    async def validate_order_exists(order_id: str) -> bool:
        """Verify order exists"""
        order = await db.orders.find_one({"id": order_id})
        return order is not None
    
    @staticmethod
    async def validate_order_delivered(order_id: str) -> bool:
        """Verify order is delivered"""
        order = await db.orders.find_one({"id": order_id})
        if not order:
            return False
        return order.get("status") == "DELIVERED"
    
    @staticmethod
    async def validate_order_not_billed(order_id: str) -> bool:
        """Verify order hasn't been billed yet"""
        order = await db.orders.find_one({"id": order_id})
        if not order:
            return False
        return order.get("billed") != True
    
    @staticmethod
    async def validate_amount_positive(amount: float) -> bool:
        """Verify billing amount is positive"""
        return amount > 0
    
    @staticmethod
    async def validate_month_format(month: str) -> bool:
        """Verify month format is YYYY-MM"""
        try:
            parts = month.split("-")
            if len(parts) != 2:
                return False
            year = int(parts[0])
            month_num = int(parts[1])
            return 1900 <= year <= 2100 and 1 <= month_num <= 12
        except:
            return False
    
    @staticmethod
    async def validate_no_duplicate_billing(order_id: str, month: str) -> bool:
        """Prevent duplicate billing for same order in same month"""
        existing = await db.billing_records.find_one({
            "order_id": order_id,
            "month": month
        })
        return existing is None


class DeliveryValidator:
    """Validators for delivery operations"""
    
    @staticmethod
    async def validate_delivery_exists(delivery_id: str) -> bool:
        """Verify delivery status record exists"""
        delivery = await db.delivery_statuses.find_one({"id": delivery_id})
        return delivery is not None
    
    @staticmethod
    async def validate_delivery_boy_exists(delivery_boy_id: str) -> bool:
        """Verify delivery boy exists"""
        delivery_boy = await db.delivery_boys.find_one({"id": delivery_boy_id})
        return delivery_boy is not None
    
    @staticmethod
    async def validate_delivery_boy_active(delivery_boy_id: str) -> bool:
        """Verify delivery boy is active"""
        delivery_boy = await db.delivery_boys.find_one({"id": delivery_boy_id})
        if not delivery_boy:
            return False
        return delivery_boy.get("status") == "active"
    
    @staticmethod
    async def validate_quantity_positive(quantity: float) -> bool:
        """Verify quantity is positive"""
        return quantity > 0
    
    @staticmethod
    async def validate_valid_delivery_status(status: str) -> bool:
        """Verify delivery status is valid"""
        valid_statuses = ["PENDING", "OUT_FOR_DELIVERY", "DELIVERED", "NOT_DELIVERED", "CANCELLED"]
        return status in valid_statuses


class SubscriptionValidator:
    """Validators for subscriptions"""
    
    @staticmethod
    async def validate_customer_exists(customer_id: str) -> bool:
        """Verify customer exists"""
        customer = await db.customers_v2.find_one({"id": customer_id})
        return customer is not None
    
    @staticmethod
    async def validate_product_exists(product_id: str) -> bool:
        """Verify product exists"""
        product = await db.products.find_one({"id": product_id})
        return product is not None
    
    @staticmethod
    async def validate_quantity_positive(quantity: float) -> bool:
        """Verify subscription quantity is positive"""
        return quantity > 0
    
    @staticmethod
    async def validate_start_date_valid(start_date: date) -> bool:
        """Verify start date is not in past"""
        today = datetime.now().date()
        return start_date >= today
    
    @staticmethod
    async def validate_end_date_after_start(start_date: date, end_date: Optional[date]) -> bool:
        """Verify end date is after start date if provided"""
        if end_date is None:
            return True
        return end_date >= start_date


# Validation utilities
class ValidationUtils:
    """Helper functions for validation"""
    
    @staticmethod
    def validate_percentage(value: float) -> bool:
        """Verify value is between 0 and 100"""
        return 0 <= value <= 100
    
    @staticmethod
    def validate_positive_number(value: float) -> bool:
        """Verify value is positive"""
        return value > 0
    
    @staticmethod
    def validate_non_negative_number(value: float) -> bool:
        """Verify value is non-negative"""
        return value >= 0
    
    @staticmethod
    def validate_string_length(text: str, min_len: int = 1, max_len: int = 500) -> bool:
        """Verify string length is within bounds"""
        return min_len <= len(text) <= max_len
    
    @staticmethod
    def validate_enum_value(value: str, valid_values: List[str]) -> bool:
        """Verify value is in allowed list"""
        return value in valid_values

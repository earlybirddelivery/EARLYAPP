"""
Subscription API - Integration Layer
Wraps subscription_engine.py with Flask/FastAPI endpoints
Supports multi-subscription per customer, all users can create subscriptions
"""

from datetime import datetime, timedelta, date as date_type
from typing import Dict, List, Optional, Tuple
import json
from subscription_engine import SubscriptionEngine

class SubscriptionAPI:
    """
    High-level API for subscription management
    Uses SubscriptionEngine for all quantity/priority calculations
    """
    
    def __init__(self, db_connection=None):
        """
        Initialize API with database connection
        
        Args:
            db_connection: MongoDB or database connection object
        """
        self.db = db_connection
        self.engine = SubscriptionEngine()
        
    # ==================== CREATE ENDPOINTS ====================
    
    def create_subscription(self, customer_id: str, mode: str, data: Dict) -> Dict:
        """
        Create new subscription - CALLED BY ALL USERS
        
        Args:
            customer_id: Customer ID
            mode: Subscription mode (fixed_daily, weekly_pattern, one_time, day_by_day, irregular)
            data: Mode-specific configuration
                fixed_daily: {"default_qty": 2, "product_id": "...", "price_per_unit": 50}
                weekly_pattern: {"weekly_pattern": [0,2,4], "default_qty": 1, "product_id": "..."}
                one_time: {"start_date": "2026-01-23", "end_date": "2026-02-23", "quantity": 5}
                day_by_day: {"product_id": "...", "price_per_unit": 50}
                irregular: {"product_id": "..."}
        
        Returns:
            Created subscription document
        """
        subscription = {
            "_id": self._generate_id(),
            "customer_id": customer_id,
            "mode": mode,
            "status": "active",  # draft, active, paused, stopped
            "created_at": datetime.now().isoformat(),
            "created_by": self._get_current_user(),  # Can be admin, support, customer
            "created_by_role": self._get_current_role(),
            **data
        }
        
        # Validate before saving
        is_valid, error = self.engine.validate_subscription(subscription)
        if not is_valid:
            return {"success": False, "error": error}
        
        # Save to database
        if self.db:
            self.db.subscriptions.insert_one(subscription)
        
        return {
            "success": True,
            "subscription": subscription,
            "message": f"Subscription created successfully"
        }
    
    def create_order(self, customer_id: str, product_id: str, 
                    quantity: int, delivery_date: str) -> Dict:
        """
        Create one-time order
        
        Args:
            customer_id: Customer ID
            product_id: Product ID
            quantity: Order quantity
            delivery_date: Delivery date (YYYY-MM-DD)
        
        Returns:
            Created order document
        """
        order = {
            "_id": self._generate_id(),
            "customer_id": customer_id,
            "type": "order",  # To distinguish from subscriptions
            "product_id": product_id,
            "quantity": quantity,
            "delivery_date": delivery_date,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "created_by": self._get_current_user()
        }
        
        if self.db:
            self.db.orders.insert_one(order)
        
        return {
            "success": True,
            "order": order,
            "message": "Order created successfully"
        }
    
    # ==================== READ ENDPOINTS ====================
    
    def get_customer_subscriptions(self, customer_id: str) -> Dict:
        """
        Get ALL subscriptions for a customer - SUPPORT TO VIEW MULTIPLE
        
        Args:
            customer_id: Customer ID
        
        Returns:
            List of all subscriptions with summaries
        """
        if not self.db:
            return {"success": False, "error": "Database not connected"}
        
        subscriptions = list(self.db.subscriptions.find(
            {"customer_id": customer_id}
        ))
        
        # Enrich with summaries and next deliveries
        for sub in subscriptions:
            summary = self.engine.get_subscription_summary(sub)
            sub["summary"] = summary
            
            # Get next 7 days of deliveries
            next_dates = self.engine.get_next_delivery_dates(
                sub, 
                datetime.now().strftime("%Y-%m-%d"), 
                days_ahead=7
            )
            sub["next_deliveries"] = next_dates
        
        return {
            "success": True,
            "customer_id": customer_id,
            "subscriptions": subscriptions,
            "count": len(subscriptions)
        }
    
    def get_customer_orders(self, customer_id: str, 
                           start_date: str = None, 
                           end_date: str = None) -> Dict:
        """
        Get all orders for a customer in date range
        
        Args:
            customer_id: Customer ID
            start_date: Optional start date (YYYY-MM-DD)
            end_date: Optional end date (YYYY-MM-DD)
        
        Returns:
            List of orders
        """
        if not self.db:
            return {"success": False, "error": "Database not connected"}
        
        query = {"customer_id": customer_id, "type": "order"}
        
        if start_date or end_date:
            query["delivery_date"] = {}
            if start_date:
                query["delivery_date"]["$gte"] = start_date
            if end_date:
                query["delivery_date"]["$lte"] = end_date
        
        orders = list(self.db.orders.find(query))
        
        return {
            "success": True,
            "customer_id": customer_id,
            "orders": orders,
            "count": len(orders)
        }
    
    def get_customer_full_info(self, customer_id: str) -> Dict:
        """
        Get complete customer information - FOR STAFF/ADMIN VIEW
        Includes all subscriptions, active orders, delivery history, pause state
        
        Args:
            customer_id: Customer ID
        
        Returns:
            Complete customer profile
        """
        if not self.db:
            return {"success": False, "error": "Database not connected"}
        
        # Get customer info
        customer = self.db.customers.find_one({"_id": customer_id})
        
        # Get subscriptions
        subs_result = self.get_customer_subscriptions(customer_id)
        subscriptions = subs_result.get("subscriptions", [])
        
        # Get active orders
        orders_result = self.get_customer_orders(customer_id)
        orders = orders_result.get("orders", [])
        
        # Get delivery history (last 30 days)
        delivery_start = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        deliveries = list(self.db.deliveries.find(
            {"customer_id": customer_id, "date": {"$gte": delivery_start}}
        )) if self.db else []
        
        # Calculate total pending deliveries
        pending_deliveries = []
        for sub in subscriptions:
            if sub["status"] == "active":
                next_dates = self.engine.get_next_delivery_dates(
                    sub,
                    datetime.now().strftime("%Y-%m-%d"),
                    days_ahead=7
                )
                pending_deliveries.extend(next_dates)
        
        # Check if customer has active pauses
        active_pauses = []
        for sub in subscriptions:
            if "pause_intervals" in sub:
                for pause in sub["pause_intervals"]:
                    if not pause.get("end") or pause["end"] >= datetime.now().strftime("%Y-%m-%d"):
                        active_pauses.append({
                            "subscription_id": sub["_id"],
                            "mode": sub["mode"],
                            "pause_start": pause["start"],
                            "pause_end": pause.get("end"),
                            "remaining_days": self._calc_remaining_pause_days(pause)
                        })
        
        return {
            "success": True,
            "customer": customer,
            "subscriptions": {
                "active": [s for s in subscriptions if s["status"] == "active"],
                "paused": [s for s in subscriptions if s["status"] == "paused"],
                "stopped": [s for s in subscriptions if s["status"] == "stopped"],
                "total": len(subscriptions)
            },
            "orders": {
                "active": [o for o in orders if o["status"] == "pending"],
                "completed": [o for o in orders if o["status"] == "delivered"],
                "total": len(orders)
            },
            "deliveries": {
                "history": deliveries,
                "pending": pending_deliveries,
                "total_last_30_days": len(deliveries)
            },
            "pause_state": {
                "is_paused": len(active_pauses) > 0,
                "active_pauses": active_pauses
            },
            "metrics": {
                "active_subscription_count": len([s for s in subscriptions if s["status"] == "active"]),
                "total_recurring_value": sum([s.get("price_per_unit", 0) * s.get("default_qty", 0) 
                                             for s in subscriptions if s["status"] == "active"]),
                "monthly_estimated_revenue": self._estimate_monthly_revenue(subscriptions)
            }
        }
    
    # ==================== UPDATE ENDPOINTS ====================
    
    def update_subscription(self, subscription_id: str, updates: Dict) -> Dict:
        """
        Update existing subscription
        
        Args:
            subscription_id: Subscription ID
            updates: Fields to update (any field except _id, customer_id)
        
        Returns:
            Updated subscription
        """
        if not self.db:
            return {"success": False, "error": "Database not connected"}
        
        # Remove protected fields
        protected = ["_id", "customer_id", "created_at", "created_by"]
        for field in protected:
            updates.pop(field, None)
        
        updates["updated_at"] = datetime.now().isoformat()
        updates["updated_by"] = self._get_current_user()
        
        result = self.db.subscriptions.find_one_and_update(
            {"_id": subscription_id},
            {"$set": updates},
            return_document=True
        )
        
        if not result:
            return {"success": False, "error": "Subscription not found"}
        
        return {
            "success": True,
            "subscription": result,
            "message": "Subscription updated successfully"
        }
    
    def pause_subscription(self, subscription_id: str, 
                          end_date: str = None) -> Dict:
        """
        Pause subscription (temporary)
        
        Args:
            subscription_id: Subscription ID
            end_date: Optional end date for pause (YYYY-MM-DD)
        
        Returns:
            Updated subscription with pause interval
        """
        if not self.db:
            return {"success": False, "error": "Database not connected"}
        
        sub = self.db.subscriptions.find_one({"_id": subscription_id})
        if not sub:
            return {"success": False, "error": "Subscription not found"}
        
        pause_interval = {
            "start": datetime.now().strftime("%Y-%m-%d"),
            "end": end_date  # None = indefinite
        }
        
        if "pause_intervals" not in sub:
            sub["pause_intervals"] = []
        
        sub["pause_intervals"].append(pause_interval)
        
        result = self.db.subscriptions.find_one_and_update(
            {"_id": subscription_id},
            {
                "$set": {
                    "pause_intervals": sub["pause_intervals"],
                    "status": "paused",
                    "paused_at": datetime.now().isoformat(),
                    "paused_by": self._get_current_user()
                }
            },
            return_document=True
        )
        
        return {
            "success": True,
            "subscription": result,
            "message": f"Subscription paused until {end_date or 'indefinite'}"
        }
    
    def resume_subscription(self, subscription_id: str) -> Dict:
        """
        Resume paused subscription
        
        Args:
            subscription_id: Subscription ID
        
        Returns:
            Updated subscription
        """
        if not self.db:
            return {"success": False, "error": "Database not connected"}
        
        result = self.db.subscriptions.find_one_and_update(
            {"_id": subscription_id},
            {
                "$set": {
                    "status": "active",
                    "resumed_at": datetime.now().isoformat(),
                    "resumed_by": self._get_current_user()
                }
            },
            return_document=True
        )
        
        if not result:
            return {"success": False, "error": "Subscription not found"}
        
        return {
            "success": True,
            "subscription": result,
            "message": "Subscription resumed successfully"
        }
    
    def stop_subscription(self, subscription_id: str) -> Dict:
        """
        Permanently stop subscription
        
        Args:
            subscription_id: Subscription ID
        
        Returns:
            Updated subscription
        """
        if not self.db:
            return {"success": False, "error": "Database not connected"}
        
        result = self.db.subscriptions.find_one_and_update(
            {"_id": subscription_id},
            {
                "$set": {
                    "status": "stopped",
                    "stopped_at": datetime.now().isoformat(),
                    "stopped_by": self._get_current_user(),
                    "stop_date": datetime.now().strftime("%Y-%m-%d")
                }
            },
            return_document=True
        )
        
        if not result:
            return {"success": False, "error": "Subscription not found"}
        
        return {
            "success": True,
            "subscription": result,
            "message": "Subscription stopped permanently"
        }
    
    # ==================== CALENDAR & DELIVERY ENDPOINTS ====================
    
    def get_calendar_deliveries(self, customer_id: str, 
                               year: int, month: int) -> Dict:
        """
        Get all deliveries for customer in specific month
        Uses engine.compute_qty() to determine deliveries
        
        Args:
            customer_id: Customer ID
            year: Year (2026, etc.)
            month: Month (1-12)
        
        Returns:
            Calendar with delivery dates and quantities
        """
        if not self.db:
            return {"success": False, "error": "Database not connected"}
        
        # Get all customer subscriptions
        subs_result = self.get_customer_subscriptions(customer_id)
        subscriptions = subs_result.get("subscriptions", [])
        
        # Generate calendar for month
        calendar = {}
        from calendar import monthrange
        days_in_month = monthrange(year, month)[1]
        
        for day in range(1, days_in_month + 1):
            date_str = f"{year:04d}-{month:02d}-{day:02d}"
            deliveries_for_day = []
            
            # Check each subscription
            for sub in subscriptions:
                qty = self.engine.compute_qty(date_str, sub)
                if qty > 0:
                    deliveries_for_day.append({
                        "subscription_id": sub["_id"],
                        "mode": sub["mode"],
                        "quantity": qty,
                        "product_id": sub.get("product_id"),
                        "summary": sub.get("summary", "Subscription")
                    })
            
            # Add one-time orders for this date
            orders = list(self.db.orders.find({
                "customer_id": customer_id,
                "delivery_date": date_str,
                "status": "pending"
            })) if self.db else []
            
            for order in orders:
                deliveries_for_day.append({
                    "order_id": order["_id"],
                    "type": "order",
                    "quantity": order["quantity"],
                    "product_id": order.get("product_id"),
                    "summary": "One-time Order"
                })
            
            if deliveries_for_day:
                calendar[date_str] = {
                    "deliveries": deliveries_for_day,
                    "total_quantity": sum([d["quantity"] for d in deliveries_for_day]),
                    "delivery_count": len(deliveries_for_day)
                }
        
        return {
            "success": True,
            "customer_id": customer_id,
            "month": f"{year:04d}-{month:02d}",
            "calendar": calendar,
            "summary": {
                "total_delivery_days": len(calendar),
                "total_deliveries": sum([c["delivery_count"] for c in calendar.values()]),
                "total_quantity": sum([c["total_quantity"] for c in calendar.values()])
            }
        }
    
    def get_date_details(self, customer_id: str, date_str: str) -> Dict:
        """
        Get detailed breakdown for specific date
        
        Args:
            customer_id: Customer ID
            date_str: Date in YYYY-MM-DD format
        
        Returns:
            Detailed delivery information for date
        """
        if not self.db:
            return {"success": False, "error": "Database not connected"}
        
        subs_result = self.get_customer_subscriptions(customer_id)
        subscriptions = subs_result.get("subscriptions", [])
        
        details = {
            "date": date_str,
            "subscriptions": [],
            "orders": [],
            "total_quantity": 0
        }
        
        # Check subscriptions
        for sub in subscriptions:
            qty = self.engine.compute_qty(date_str, sub)
            if qty > 0:
                details["subscriptions"].append({
                    "subscription_id": sub["_id"],
                    "mode": sub["mode"],
                    "quantity": qty,
                    "product_id": sub.get("product_id"),
                    "frequency": sub.get("summary", {}).get("frequency", "N/A"),
                    "status": sub["status"]
                })
                details["total_quantity"] += qty
        
        # Check orders
        orders = list(self.db.orders.find({
            "customer_id": customer_id,
            "delivery_date": date_str,
            "status": "pending"
        })) if self.db else []
        
        for order in orders:
            details["orders"].append({
                "order_id": order["_id"],
                "quantity": order["quantity"],
                "product_id": order.get("product_id"),
                "status": "pending"
            })
            details["total_quantity"] += order["quantity"]
        
        return {
            "success": True,
            "details": details,
            "has_deliveries": len(details["subscriptions"]) + len(details["orders"]) > 0
        }
    
    # ==================== HELPER METHODS ====================
    
    def _generate_id(self):
        """Generate unique ID"""
        import uuid
        return str(uuid.uuid4())
    
    def _get_current_user(self):
        """Get current user (from session/context)"""
        return "system_user"  # TODO: Get from Flask/FastAPI context
    
    def _get_current_role(self):
        """Get current user role (admin, support, delivery, customer)"""
        return "admin"  # TODO: Get from Flask/FastAPI context
    
    def _calc_remaining_pause_days(self, pause: Dict) -> Optional[int]:
        """Calculate remaining pause days"""
        if not pause.get("end"):
            return None  # Indefinite
        
        end_date = datetime.strptime(pause["end"], "%Y-%m-%d")
        remaining = (end_date - datetime.now()).days
        return max(0, remaining)
    
    def _estimate_monthly_revenue(self, subscriptions: List[Dict]) -> float:
        """Estimate monthly recurring revenue from subscriptions"""
        total = 0
        for sub in subscriptions:
            if sub["status"] == "active":
                if sub["mode"] == "fixed_daily":
                    # 30 days * qty * price
                    qty = sub.get("default_qty", 0)
                    price = sub.get("price_per_unit", 0)
                    total += 30 * qty * price
                elif sub["mode"] == "weekly_pattern":
                    # days_per_week * 4.3 weeks * qty * price
                    days = len(sub.get("weekly_pattern", []))
                    qty = sub.get("default_qty", 0)
                    price = sub.get("price_per_unit", 0)
                    total += days * 4.3 * qty * price
        
        return total


# ==================== FLASK ROUTE EXAMPLES ====================

def register_subscription_routes(app, api: SubscriptionAPI):
    """
    Register subscription API routes with Flask app
    
    Usage:
        from flask import Flask
        app = Flask(__name__)
        api = SubscriptionAPI(db)
        register_subscription_routes(app, api)
    """
    
    @app.route('/api/subscriptions/create', methods=['POST'])
    def create_subscription():
        from flask import request, jsonify
        data = request.json
        result = api.create_subscription(
            customer_id=data['customer_id'],
            mode=data['mode'],
            data=data['config']
        )
        return jsonify(result)
    
    @app.route('/api/subscriptions/customer/<customer_id>', methods=['GET'])
    def get_customer_subscriptions(customer_id):
        from flask import jsonify
        result = api.get_customer_subscriptions(customer_id)
        return jsonify(result)
    
    @app.route('/api/customers/<customer_id>/info', methods=['GET'])
    def get_customer_info(customer_id):
        from flask import jsonify
        result = api.get_customer_full_info(customer_id)
        return jsonify(result)
    
    @app.route('/api/calendar/<customer_id>/<int:year>/<int:month>', methods=['GET'])
    def get_calendar(customer_id, year, month):
        from flask import jsonify
        result = api.get_calendar_deliveries(customer_id, year, month)
        return jsonify(result)
    
    @app.route('/api/calendar/<customer_id>/<date_str>', methods=['GET'])
    def get_date_details(customer_id, date_str):
        from flask import jsonify
        result = api.get_date_details(customer_id, date_str)
        return jsonify(result)
    
    @app.route('/api/subscriptions/<subscription_id>/pause', methods=['POST'])
    def pause_subscription(subscription_id):
        from flask import request, jsonify
        data = request.json
        result = api.pause_subscription(
            subscription_id,
            end_date=data.get('end_date')
        )
        return jsonify(result)
    
    @app.route('/api/subscriptions/<subscription_id>/resume', methods=['POST'])
    def resume_subscription(subscription_id):
        from flask import jsonify
        result = api.resume_subscription(subscription_id)
        return jsonify(result)
    
    @app.route('/api/orders/create', methods=['POST'])
    def create_order():
        from flask import request, jsonify
        data = request.json
        result = api.create_order(
            customer_id=data['customer_id'],
            product_id=data['product_id'],
            quantity=data['quantity'],
            delivery_date=data['delivery_date']
        )
        return jsonify(result)

"""
Complete Subscription Engine - Phase 0
Implements all subscription modes, priority logic, and quantity calculation
"""
from datetime import datetime, date as date_type, timedelta
from typing import Dict, List, Optional, Tuple

class SubscriptionEngine:
    """
    Master subscription engine with priority-based quantity calculation
    
    Priority Order (Top to bottom):
    1. Draft → 0
    2. Stopped → 0
    3. Stop date → 0
    4. Pause → 0
    5. Irregular → qty
    6. Day override → qty
    7. Weekly pattern → qty
    8. Fixed daily → qty
    9. Else → 0
    """
    
    @staticmethod
    def compute_qty(date_str: str, subscription: Dict) -> float:
        """
        Master algorithm to compute delivery quantity for a specific date
        
        Args:
            date_str: Date in YYYY-MM-DD format
            subscription: Subscription document from MongoDB
            
        Returns:
            Quantity for the date (0 if no delivery)
        """
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        # Priority 1: Draft subscriptions never deliver
        if subscription.get("status") == "draft":
            return 0.0
        
        # Priority 2: Stopped subscriptions never deliver
        if subscription.get("status") == "stopped":
            return 0.0
        
        # Priority 3: Check stop date (permanent)
        stop_date = subscription.get("stop_date")
        if stop_date:
            stop_dt = datetime.strptime(stop_date, "%Y-%m-%d").date()
            if target_date >= stop_dt:
                return 0.0
        
        # Priority 4: Check pause intervals (temporary)
        pause_intervals = subscription.get("pause_intervals", [])
        for interval in pause_intervals:
            start_dt = datetime.strptime(interval["start"], "%Y-%m-%d").date()
            # If end is None or missing, pause is indefinite (until manually resumed)
            end_dt = datetime.strptime(interval["end"], "%Y-%m-%d").date() if interval.get("end") else date_type(9999, 12, 31)
            if start_dt <= target_date <= end_dt:
                return 0.0
        
        # Priority 5: Check irregular list (specific dates)
        irregular_list = subscription.get("irregular_list", [])
        for irregular in irregular_list:
            if irregular["date"] == date_str:
                return float(irregular["quantity"])
        
        # Priority 6: Check day overrides (day-by-day mode)
        day_overrides = subscription.get("day_overrides", [])
        for override in day_overrides:
            if override["date"] == date_str:
                return float(override["quantity"])
        
        # Priority 7: Check weekly pattern
        if subscription.get("mode") == "weekly_pattern":
            weekly_pattern = subscription.get("weekly_pattern")
            if weekly_pattern:
                weekday = target_date.weekday()  # 0=Monday, 6=Sunday
                if weekday in weekly_pattern:
                    return float(subscription.get("default_qty", 0))
                else:
                    return 0.0
        
        # Priority 8: One-time mode (check date range)
        if subscription.get("mode") == "one_time":
            start_date = subscription.get("startDate") or subscription.get("start_date")
            end_date = subscription.get("endDate") or subscription.get("end_date")
            if start_date and end_date:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
                end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
                if start_dt <= target_date <= end_dt:
                    return float(subscription.get("quantity") or subscription.get("default_qty", 0))
            return 0.0
        
        # Priority 9: Fixed daily mode
        if subscription.get("mode") == "fixed_daily":
            return float(subscription.get("default_qty", 0))
        
        # Priority 10: Day-by-day without override = 0
        if subscription.get("mode") == "day_by_day":
            return 0.0
        
        # Priority 11: Irregular mode without entry = 0
        if subscription.get("mode") == "irregular":
            return 0.0
        
        # Default: No delivery
        return 0.0
    
    @staticmethod
    def is_delivery_eligible(customer: Dict, subscription: Dict) -> bool:
        """
        Check if subscription is eligible for delivery generation
        
        Requirements:
        1. Customer status = "active" OR "trial" (for one-time subscriptions, trial customers can receive deliveries)
        2. Subscription status = "active" (NOT draft/stopped)
        3. Subscription autoStart = True
        
        Returns:
            True if eligible, False otherwise
        """
        # Allow trial customers for one-time subscriptions (e.g., admin-approved product requests)
        customer_status = customer.get("status")
        if subscription.get("mode") == "one_time":
            if customer_status not in ["active", "trial"]:
                return False
        else:
            if customer_status != "active":
                return False
        
        if subscription.get("status") != "active":
            return False
        
        if not subscription.get("auto_start", False):
            return False
        
        return True
    
    @staticmethod
    def get_pending_irregular_entries(subscription: Dict, start_date: str, end_date: str) -> int:
        """
        Count how many dates in range have no irregular entry
        Used to warn user before generating delivery list
        
        Args:
            subscription: Subscription with mode="irregular"
            start_date: Start date YYYY-MM-DD
            end_date: End date YYYY-MM-DD
            
        Returns:
            Number of dates without irregular entries
        """
        if subscription.get("mode") != "irregular":
            return 0
        
        irregular_list = subscription.get("irregular_list", [])
        irregular_dates = set(item["date"] for item in irregular_list)
        
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        pending_count = 0
        current = start_dt
        while current <= end_dt:
            if current.isoformat() not in irregular_dates:
                pending_count += 1
            current = current + timedelta(days=1)
        
        return pending_count
    
    @staticmethod
    def explain_weekly_pattern(pattern: List[int]) -> str:
        """
        Convert weekly pattern to human-readable format
        
        Args:
            pattern: List of weekday numbers [0-6] where 0=Monday, 6=Sunday
            
        Returns:
            Human-readable string like "Mon, Wed, Fri"
        """
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        return ", ".join([days[i] for i in sorted(pattern) if 0 <= i < 7])
    
    @staticmethod
    def validate_subscription(subscription: Dict) -> tuple[bool, Optional[str]]:
        """
        Validate subscription data before saving
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Required fields
        if not subscription.get("customer_id"):
            return False, "customer_id is required"
        
        if not subscription.get("mode"):
            return False, "mode is required"
        
        # Mode-specific validation
        mode = subscription.get("mode")
        
        if mode == "weekly_pattern":
            pattern = subscription.get("weekly_pattern")
            if not pattern or not isinstance(pattern, list):
                return False, "weekly_pattern must be a list of weekday numbers (0-6)"
            if not all(isinstance(day, int) and 0 <= day < 7 for day in pattern):
                return False, "weekly_pattern must contain only numbers 0-6 (Mon-Sun)"
        
        if mode in ["fixed_daily", "weekly_pattern"]:
            if not subscription.get("default_qty"):
                return False, f"{mode} requires default_qty"
        
        # Status validation
        status = subscription.get("status", "draft")
        if status not in ["draft", "active", "paused", "stopped"]:
            return False, "Invalid status"
        
        # If active, product and price required
        if status == "active":
            if not subscription.get("product_id"):
                return False, "product_id required for active subscription"
            if not subscription.get("price_per_unit"):
                return False, "price_per_unit required for active subscription"
        
        return True, None

# Global instance
subscription_engine = SubscriptionEngine()

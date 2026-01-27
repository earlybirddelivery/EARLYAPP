from datetime import date, timedelta
from typing import List, Dict, Optional
from models import Subscription, SubscriptionPattern, SubscriptionOverride, SubscriptionPause

class SubscriptionEngine:
    """Complex subscription engine handling patterns, overrides, and pauses"""
    
    def should_deliver_today(self, subscription: Dict, target_date: date) -> tuple[bool, Optional[int]]:
        """
        Determine if subscription should be delivered on target_date
        Returns: (should_deliver, quantity)
        """
        
        # Check if subscription is active
        if not subscription.get('is_active', True):
            return False, None
        
        # Check date range
        start_date = self._parse_date(subscription.get('start_date'))
        end_date = self._parse_date(subscription.get('end_date'))
        
        if target_date < start_date:
            return False, None
        
        if end_date and target_date > end_date:
            return False, None
        
        # Check if date is paused
        if self._is_date_paused(subscription, target_date):
            return False, None
        
        # Check for override
        override_qty = self._get_override_quantity(subscription, target_date)
        if override_qty is not None:
            return True, override_qty
        
        # Check pattern
        pattern = subscription.get('pattern')
        base_quantity = subscription.get('quantity', 1)
        
        if pattern == SubscriptionPattern.DAILY:
            return True, base_quantity
        
        elif pattern == SubscriptionPattern.ALTERNATE_DAYS:
            days_diff = (target_date - start_date).days
            return days_diff % 2 == 0, base_quantity
        
        elif pattern == SubscriptionPattern.WEEKLY:
            # Deliver on the same day of week as start_date
            return target_date.weekday() == start_date.weekday(), base_quantity
        
        elif pattern == SubscriptionPattern.CUSTOM_DAYS:
            custom_days = subscription.get('custom_days', [])
            return target_date.weekday() in custom_days, base_quantity
        
        return False, None
    
    def get_delivery_calendar(self, subscription: Dict, start_date: date, days: int = 30) -> List[Dict]:
        """
        Generate delivery calendar for next N days
        Returns list of {date, quantity, status}
        """
        calendar = []
        
        for i in range(days):
            target_date = start_date + timedelta(days=i)
            should_deliver, quantity = self.should_deliver_today(subscription, target_date)
            
            status = "scheduled" if should_deliver else "no_delivery"
            
            if should_deliver:
                # Check if it's an override
                override_qty = self._get_override_quantity(subscription, target_date)
                if override_qty is not None:
                    status = "override"
            elif self._is_date_paused(subscription, target_date):
                status = "paused"
            
            calendar.append({
                "date": target_date.isoformat(),
                "quantity": quantity if should_deliver else 0,
                "status": status
            })
        
        return calendar
    
    def calculate_next_delivery_date(self, subscription: Dict, from_date: date) -> Optional[date]:
        """
        Calculate next delivery date from given date
        """
        # Check up to 60 days ahead
        for i in range(1, 61):
            target_date = from_date + timedelta(days=i)
            should_deliver, _ = self.should_deliver_today(subscription, target_date)
            if should_deliver:
                return target_date
        
        return None
    
    def _is_date_paused(self, subscription: Dict, target_date: date) -> bool:
        """Check if date falls within any pause period"""
        pauses = subscription.get('pauses', [])
        
        for pause in pauses:
            start = self._parse_date(pause.get('start_date'))
            end = self._parse_date(pause.get('end_date'))
            
            if start <= target_date <= end:
                return True
        
        return False
    
    def _get_override_quantity(self, subscription: Dict, target_date: date) -> Optional[int]:
        """Get override quantity for specific date"""
        overrides = subscription.get('overrides', [])
        
        for override in overrides:
            override_date = self._parse_date(override.get('date'))
            if override_date == target_date:
                return override.get('quantity', 0)
        
        return None
    
    def _parse_date(self, date_value) -> Optional[date]:
        """Parse date from various formats"""
        if date_value is None:
            return None
        
        if isinstance(date_value, date):
            return date_value
        
        if isinstance(date_value, str):
            return date.fromisoformat(date_value)
        
        return None
    
    def get_total_quantity_for_period(self, subscription: Dict, start_date: date, end_date: date) -> int:
        """
        Calculate total quantity to be delivered in a date range
        """
        total = 0
        current = start_date
        
        while current <= end_date:
            should_deliver, quantity = self.should_deliver_today(subscription, current)
            if should_deliver and quantity:
                total += quantity
            current += timedelta(days=1)
        
        return total

# Singleton instance
subscription_engine = SubscriptionEngine()

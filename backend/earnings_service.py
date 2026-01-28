"""
earnings_service.py - Staff Earnings Calculation Engine
Manages delivery boy earnings, bonuses, deductions, and payout tracking
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any
from database import db
from decimal import Decimal
import math

# Base rates (configurable)
BASE_DELIVERY_RATE = 50  # ₹50 per delivery
LATE_NIGHT_MULTIPLIER = 1.5  # 50% extra for 9PM-6AM
PEAK_HOURS_MULTIPLIER = 1.2  # 20% extra for 12-2PM, 7-9PM

# Bonuses
ON_TIME_THRESHOLD = 0.95  # 95% on-time delivery rate
ON_TIME_BONUS_PERCENT = 0.05  # 5% bonus on earnings
RATING_THRESHOLD = 4.5  # 4.5+ stars
RATING_BONUS_FIXED = 10  # ₹10 per day with 4.5+ rating
NO_COMPLAINT_BONUS = 5  # ₹5 per complaint-free day

# Deductions
COMPLAINT_DEDUCTION = 20  # ₹20 per complaint
CANCELLATION_DEDUCTION = 10  # ₹10 per cancelled delivery
LATE_CANCEL_DEDUCTION = 15  # ₹15 for late cancellation


class EarningsService:
    """
    Core earnings calculation service
    Handles daily/weekly/monthly calculations
    """
    
    @staticmethod
    def calculate_delivery_earnings(
        delivery_id: str,
        delivery_distance_km: float,
        delivery_time_minutes: int,
        is_late_night: bool = False,
        is_peak_hour: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate earnings for a single delivery
        
        Args:
            delivery_id: Unique delivery identifier
            delivery_distance_km: Distance traveled in km
            delivery_time_minutes: Total time taken in minutes
            is_late_night: True if between 9PM-6AM
            is_peak_hour: True if between 12-2PM or 7-9PM
        
        Returns:
            {
                "delivery_id": str,
                "base_amount": float,
                "distance_bonus": float,
                "time_multiplier": float,
                "peak_hour_bonus": float,
                "total_earned": float
            }
        """
        # Base amount per delivery
        base_amount = Decimal(str(BASE_DELIVERY_RATE))
        
        # Distance bonus (₹0.50 per km)
        distance_bonus = Decimal(str(delivery_distance_km * 0.5))
        
        # Time multiplier (base amount * multiplier)
        time_multiplier = Decimal(str(LATE_NIGHT_MULTIPLIER if is_late_night else 1.0))
        
        # Peak hour bonus (additional)
        peak_hour_bonus = Decimal(str(base_amount * PEAK_HOURS_MULTIPLIER - base_amount)) if is_peak_hour else Decimal(0)
        
        # Total earned
        total_earned = (base_amount * time_multiplier) + distance_bonus + peak_hour_bonus
        
        return {
            "delivery_id": delivery_id,
            "base_amount": float(base_amount),
            "distance_km": delivery_distance_km,
            "distance_bonus": float(distance_bonus),
            "time_multiplier": float(time_multiplier),
            "is_late_night": is_late_night,
            "peak_hour_bonus": float(peak_hour_bonus),
            "is_peak_hour": is_peak_hour,
            "total_earned": float(total_earned)
        }
    
    @staticmethod
    async def calculate_daily_earnings(
        delivery_boy_id: str,
        date_str: str  # Format: "2024-01-20"
    ) -> Dict[str, Any]:
        """
        Calculate daily earnings for a delivery boy
        
        Includes:
        - Base delivery earnings
        - Distance bonuses
        - Peak hour bonuses
        - Rating-based bonuses
        - Complaint deductions
        
        Args:
            delivery_boy_id: Unique delivery boy identifier
            date_str: Date string in YYYY-MM-DD format
        
        Returns:
            {
                "delivery_boy_id": str,
                "date": str,
                "deliveries": int,
                "base_earnings": float,
                "bonuses": {...},
                "deductions": {...},
                "net_earnings": float,
                "summary": {...}
            }
        """
        try:
            # Parse date
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            next_date = target_date + timedelta(days=1)
            
            # Get all deliveries for this day
            deliveries = await db.delivery_statuses.find({
                "delivery_boy_id": delivery_boy_id,
                "delivered_at": {
                    "$gte": datetime.combine(target_date, datetime.min.time()),
                    "$lt": datetime.combine(next_date, datetime.min.time())
                }
            }).to_list(None)
            
            base_earnings = 0.0
            total_distance = 0.0
            completed_count = 0
            late_deliveries = 0
            
            # Calculate delivery earnings
            for delivery in deliveries:
                if delivery.get("status") == "delivered":
                    completed_count += 1
                    
                    # Get delivery details
                    distance = delivery.get("distance_km", 0)
                    total_distance += distance
                    
                    # Calculate base earnings
                    distance_bonus = distance * 0.5  # ₹0.50 per km
                    base_delivery = BASE_DELIVERY_RATE + distance_bonus
                    
                    # Check if late night
                    delivered_at = delivery.get("delivered_at")
                    if delivered_at:
                        hour = delivered_at.hour
                        if hour >= 21 or hour < 6:  # 9PM - 6AM
                            base_delivery *= LATE_NIGHT_MULTIPLIER
                    
                    base_earnings += base_delivery
                    
                    # Check if late
                    eta = delivery.get("estimated_arrival_time")
                    if eta and delivered_at and delivered_at > eta:
                        late_deliveries += 1
            
            # Calculate bonuses
            bonuses = {}
            total_bonuses = 0.0
            
            # On-time delivery bonus (95%+ on-time rate)
            if completed_count > 0:
                on_time_rate = (completed_count - late_deliveries) / completed_count
                if on_time_rate >= ON_TIME_THRESHOLD:
                    on_time_bonus = base_earnings * ON_TIME_BONUS_PERCENT
                    bonuses["on_time_bonus"] = round(on_time_bonus, 2)
                    total_bonuses += on_time_bonus
            
            # Rating bonus (4.5+ stars = ₹10/day)
            delivery_boy = await db.delivery_boys_v2.find_one({"_id": delivery_boy_id})
            if delivery_boy:
                rating = delivery_boy.get("average_rating", 0)
                if rating >= RATING_THRESHOLD:
                    bonuses["rating_bonus"] = RATING_BONUS_FIXED
                    total_bonuses += RATING_BONUS_FIXED
            
            # No complaint bonus (₹5 if no complaints today)
            complaints_today = await db.complaints.count_documents({
                "delivery_boy_id": delivery_boy_id,
                "created_at": {
                    "$gte": datetime.combine(target_date, datetime.min.time()),
                    "$lt": datetime.combine(next_date, datetime.min.time())
                }
            })
            
            if complaints_today == 0 and completed_count > 0:
                bonuses["no_complaint_bonus"] = NO_COMPLAINT_BONUS
                total_bonuses += NO_COMPLAINT_BONUS
            
            # Calculate deductions
            deductions = {}
            total_deductions = 0.0
            
            # Complaint deductions
            deductions["complaint_deductions"] = complaints_today * COMPLAINT_DEDUCTION
            total_deductions += complaints_today * COMPLAINT_DEDUCTION
            
            # Calculate net earnings
            net_earnings = base_earnings + total_bonuses - total_deductions
            
            return {
                "delivery_boy_id": delivery_boy_id,
                "date": date_str,
                "deliveries_completed": completed_count,
                "total_distance_km": round(total_distance, 2),
                "base_earnings": round(base_earnings, 2),
                "bonuses": bonuses,
                "total_bonuses": round(total_bonuses, 2),
                "deductions": deductions,
                "total_deductions": round(total_deductions, 2),
                "net_earnings": round(net_earnings, 2),
                "summary": {
                    "on_time_rate": round((completed_count - late_deliveries) / completed_count * 100, 1) if completed_count > 0 else 0,
                    "complaints": complaints_today,
                    "rating": delivery_boy.get("average_rating", 0) if delivery_boy else 0
                }
            }
        
        except Exception as e:
            raise Exception(f"Failed to calculate daily earnings: {str(e)}")
    
    @staticmethod
    async def calculate_weekly_earnings(
        delivery_boy_id: str,
        week_start_date: str  # Format: "2024-01-20" (Monday)
    ) -> Dict[str, Any]:
        """
        Calculate weekly earnings (Monday-Sunday)
        
        Args:
            delivery_boy_id: Unique delivery boy identifier
            week_start_date: Start date of the week (Monday) in YYYY-MM-DD format
        
        Returns:
            {
                "delivery_boy_id": str,
                "week_start": str,
                "week_end": str,
                "daily_breakdown": [...],
                "total_earnings": float,
                "average_daily": float,
                "best_day": {...},
                "performance": {...}
            }
        """
        try:
            daily_breakdown = []
            total_earnings = 0.0
            total_deliveries = 0
            total_complaints = 0
            
            # Calculate for each day of the week
            week_start = datetime.strptime(week_start_date, "%Y-%m-%d").date()
            
            for day_offset in range(7):  # Monday to Sunday
                current_date = week_start + timedelta(days=day_offset)
                current_date_str = current_date.strftime("%Y-%m-%d")
                
                daily_earnings = await EarningsService.calculate_daily_earnings(
                    delivery_boy_id,
                    current_date_str
                )
                
                daily_breakdown.append(daily_earnings)
                total_earnings += daily_earnings["net_earnings"]
                total_deliveries += daily_earnings["deliveries_completed"]
                total_complaints += daily_earnings["summary"]["complaints"]
            
            # Find best day
            best_day = max(daily_breakdown, key=lambda x: x["net_earnings"])
            
            # Calculate average
            average_daily = total_earnings / 7.0
            
            week_end = week_start + timedelta(days=6)
            
            return {
                "delivery_boy_id": delivery_boy_id,
                "week_start": week_start_date,
                "week_end": week_end.strftime("%Y-%m-%d"),
                "daily_breakdown": daily_breakdown,
                "total_earnings": round(total_earnings, 2),
                "average_daily_earnings": round(average_daily, 2),
                "total_deliveries": total_deliveries,
                "total_complaints": total_complaints,
                "best_day": best_day,
                "performance": {
                    "consistency": "High" if total_earnings > average_daily * 5 else "Medium" if total_earnings > average_daily * 3 else "Low",
                    "complaint_rate": round(total_complaints / max(total_deliveries, 1) * 100, 1),
                    "avg_daily_deliveries": round(total_deliveries / 7, 1)
                }
            }
        
        except Exception as e:
            raise Exception(f"Failed to calculate weekly earnings: {str(e)}")
    
    @staticmethod
    async def calculate_monthly_earnings(
        delivery_boy_id: str,
        year: int,
        month: int
    ) -> Dict[str, Any]:
        """
        Calculate monthly earnings
        
        Args:
            delivery_boy_id: Unique delivery boy identifier
            year: Year (e.g., 2024)
            month: Month (1-12)
        
        Returns:
            {
                "delivery_boy_id": str,
                "year": int,
                "month": int,
                "total_earnings": float,
                "total_deliveries": int,
                "weekly_breakdown": [...],
                "payment_status": str,
                "payout_date": str
            }
        """
        try:
            from calendar import monthrange
            
            # Get days in month
            _, days_in_month = monthrange(year, month)
            
            # Calculate weekly earnings for the month
            weekly_breakdown = []
            total_earnings = 0.0
            total_deliveries = 0
            
            # First day of month
            month_start = date(year, month, 1)
            
            # Process each week
            current_date = month_start
            while current_date.month == month:
                # Get Monday of this week
                week_start = current_date - timedelta(days=current_date.weekday())
                
                # Skip if before month start
                if week_start < month_start:
                    week_start = month_start
                
                week_earnings = await EarningsService.calculate_weekly_earnings(
                    delivery_boy_id,
                    week_start.strftime("%Y-%m-%d")
                )
                
                if week_earnings["total_earnings"] > 0:
                    weekly_breakdown.append(week_earnings)
                    total_earnings += week_earnings["total_earnings"]
                    total_deliveries += week_earnings["total_deliveries"]
                
                # Move to next week
                current_date = week_start + timedelta(days=7)
            
            # Determine payment status
            payment_status = "PENDING"  # Default
            payout_date = None
            
            # Check if already paid this month
            existing_payout = await db.payouts.find_one({
                "delivery_boy_id": delivery_boy_id,
                "month": month,
                "year": year
            })
            
            if existing_payout:
                payment_status = existing_payout.get("status", "PENDING")
                payout_date = existing_payout.get("payout_date")
            
            return {
                "delivery_boy_id": delivery_boy_id,
                "year": year,
                "month": month,
                "month_name": date(year, month, 1).strftime("%B"),
                "total_earnings": round(total_earnings, 2),
                "total_deliveries": total_deliveries,
                "average_daily_earnings": round(total_earnings / days_in_month, 2),
                "weekly_breakdown": weekly_breakdown,
                "payment_status": payment_status,
                "payout_date": payout_date,
                "number_of_weeks": len(weekly_breakdown)
            }
        
        except Exception as e:
            raise Exception(f"Failed to calculate monthly earnings: {str(e)}")
    
    @staticmethod
    async def get_earnings_statement(
        delivery_boy_id: str,
        start_date: str,
        end_date: str
    ) -> Dict[str, Any]:
        """
        Get comprehensive earnings statement for date range
        
        Args:
            delivery_boy_id: Unique delivery boy identifier
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
        
        Returns:
            Detailed earnings statement with all metrics
        """
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
            
            # Collect daily data
            daily_earnings_list = []
            total_earnings = 0.0
            total_deliveries = 0
            total_bonuses = 0.0
            total_deductions = 0.0
            
            current_date = start
            while current_date <= end:
                daily_earnings = await EarningsService.calculate_daily_earnings(
                    delivery_boy_id,
                    current_date.strftime("%Y-%m-%d")
                )
                
                if daily_earnings["deliveries_completed"] > 0:
                    daily_earnings_list.append(daily_earnings)
                    total_earnings += daily_earnings["net_earnings"]
                    total_deliveries += daily_earnings["deliveries_completed"]
                    total_bonuses += daily_earnings["total_bonuses"]
                    total_deductions += daily_earnings["total_deductions"]
                
                current_date += timedelta(days=1)
            
            # Calculate statistics
            days_worked = len([d for d in daily_earnings_list if d["deliveries_completed"] > 0])
            avg_daily_earnings = total_earnings / days_worked if days_worked > 0 else 0
            avg_daily_deliveries = total_deliveries / days_worked if days_worked > 0 else 0
            
            return {
                "delivery_boy_id": delivery_boy_id,
                "period": {
                    "start": start_date,
                    "end": end_date,
                    "days": (end - start).days + 1
                },
                "earnings": {
                    "total": round(total_earnings, 2),
                    "average_daily": round(avg_daily_earnings, 2),
                    "bonuses": round(total_bonuses, 2),
                    "deductions": round(total_deductions, 2),
                    "base_earnings": round(total_earnings - total_bonuses + total_deductions, 2)
                },
                "deliveries": {
                    "total": total_deliveries,
                    "average_daily": round(avg_daily_deliveries, 1),
                    "days_worked": days_worked
                },
                "daily_breakdown": daily_earnings_list,
                "top_earning_day": max(daily_earnings_list, key=lambda x: x["net_earnings"]) if daily_earnings_list else None,
                "lowest_earning_day": min(daily_earnings_list, key=lambda x: x["net_earnings"]) if daily_earnings_list else None
            }
        
        except Exception as e:
            raise Exception(f"Failed to generate earnings statement: {str(e)}")
    
    @staticmethod
    async def request_payout(
        delivery_boy_id: str,
        amount: float,
        payment_method: str = "bank_transfer"
    ) -> Dict[str, Any]:
        """
        Create payout request
        
        Args:
            delivery_boy_id: Unique delivery boy identifier
            amount: Amount to request (₹)
            payment_method: bank_transfer, wallet, upi
        
        Returns:
            Payout request details
        """
        try:
            # Create payout request
            payout_request = {
                "delivery_boy_id": delivery_boy_id,
                "amount": amount,
                "payment_method": payment_method,
                "status": "PENDING",
                "requested_at": datetime.now().isoformat(),
                "processed_at": None,
                "reference_id": f"PO-{delivery_boy_id}-{int(datetime.now().timestamp())}"
            }
            
            result = await db.payout_requests.insert_one(payout_request)
            
            payout_request["_id"] = str(result.inserted_id)
            payout_request.pop("_id", None)
            
            return payout_request
        
        except Exception as e:
            raise Exception(f"Failed to create payout request: {str(e)}")
    
    @staticmethod
    async def approve_payout(
        payout_request_id: str,
        approved_by: str
    ) -> Dict[str, Any]:
        """
        Approve payout request (admin only)
        
        Args:
            payout_request_id: Payout request identifier
            approved_by: Admin user ID
        
        Returns:
            Updated payout request
        """
        try:
            result = await db.payout_requests.update_one(
                {"_id": payout_request_id},
                {
                    "$set": {
                        "status": "APPROVED",
                        "approved_at": datetime.now().isoformat(),
                        "approved_by": approved_by,
                        "processed_at": datetime.now().isoformat()
                    }
                }
            )
            
            return {
                "success": result.modified_count > 0,
                "message": "Payout approved"
            }
        
        except Exception as e:
            raise Exception(f"Failed to approve payout: {str(e)}")
    
    @staticmethod
    async def get_delivery_boy_summary(delivery_boy_id: str) -> Dict[str, Any]:
        """
        Get delivery boy earnings summary (lifetime & current period)
        
        Args:
            delivery_boy_id: Unique delivery boy identifier
        
        Returns:
            Comprehensive summary
        """
        try:
            # Get delivery boy info
            delivery_boy = await db.delivery_boys_v2.find_one({"_id": delivery_boy_id})
            
            if not delivery_boy:
                raise ValueError(f"Delivery boy not found: {delivery_boy_id}")
            
            # Current month earnings
            today = date.today()
            current_month_earnings = await EarningsService.calculate_monthly_earnings(
                delivery_boy_id,
                today.year,
                today.month
            )
            
            # Last 30 days earnings
            end_date = today
            start_date = today - timedelta(days=30)
            last_30_days = await EarningsService.get_earnings_statement(
                delivery_boy_id,
                start_date.strftime("%Y-%m-%d"),
                end_date.strftime("%Y-%m-%d")
            )
            
            # Total lifetime deliveries & earnings (from database)
            lifetime_stats = await db.delivery_statuses.aggregate([
                {
                    "$match": {
                        "delivery_boy_id": delivery_boy_id,
                        "status": "delivered"
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total_deliveries": {"$sum": 1},
                        "total_distance": {"$sum": "$distance_km"}
                    }
                }
            ]).to_list(1)
            
            lifetime_deliveries = lifetime_stats[0]["total_deliveries"] if lifetime_stats else 0
            lifetime_distance = lifetime_stats[0]["total_distance"] if lifetime_stats else 0
            
            return {
                "delivery_boy_id": delivery_boy_id,
                "name": delivery_boy.get("name"),
                "phone": delivery_boy.get("phone"),
                "rating": delivery_boy.get("average_rating", 0),
                "total_orders": delivery_boy.get("total_orders", 0),
                "current_month": current_month_earnings,
                "last_30_days": last_30_days,
                "lifetime": {
                    "total_deliveries": lifetime_deliveries,
                    "total_distance_km": round(lifetime_distance, 2)
                },
                "payment_pending": delivery_boy.get("payment_pending", 0),
                "last_payout_date": delivery_boy.get("last_payout_date")
            }
        
        except Exception as e:
            raise Exception(f"Failed to get delivery boy summary: {str(e)}")


# Export for use in routes
__all__ = ["EarningsService"]

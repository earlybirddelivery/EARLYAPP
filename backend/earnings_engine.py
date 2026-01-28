"""
earnings_engine.py - Staff Earnings & Wallet Management
Calculates delivery staff earnings, bonuses, deductions, and manages payouts
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from decimal import Decimal
from database import db
from enum import Enum
import math

# Earning configuration
BASE_DELIVERY_RATE = 25  # ₹25 per delivery
ON_TIME_BONUS_RATE = 0.05  # 5% bonus if >95% on-time
RATING_BONUS = 10  # ₹10 bonus if rating >4.5
MAX_MONTHLY_BONUS = 5000  # Cap on total bonuses
PAYOUT_MIN_AMOUNT = 500  # Minimum payout amount


class EarningType(str, Enum):
    """Types of earnings"""
    BASE_DELIVERY = "base_delivery"
    ON_TIME_BONUS = "on_time_bonus"
    RATING_BONUS = "rating_bonus"
    REFERRAL_BONUS = "referral_bonus"
    INCENTIVE = "incentive"
    DEDUCTION = "deduction"
    ADJUSTMENT = "adjustment"


class PayoutStatus(str, Enum):
    """Payout statuses"""
    PENDING = "pending"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class EarningsEngine:
    """Core earnings calculation and management engine"""
    
    @staticmethod
    async def calculate_delivery_earnings(
        delivery_boy_id: str,
        delivery_id: str,
        delivery_distance_km: float,
        delivery_time_minutes: float,
        is_on_time: bool,
        delivery_rating: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculate earnings for a single delivery
        
        Includes:
        - Base delivery rate
        - Distance bonus (0.5₹ per km)
        - On-time bonus (5% of base if >95% on-time)
        - Rating bonus (₹10 if >4.5 stars)
        
        Args:
            delivery_boy_id: ID of delivery boy
            delivery_id: ID of delivery
            delivery_distance_km: Distance traveled in km
            delivery_time_minutes: Time taken in minutes
            is_on_time: Whether delivery was on time
            delivery_rating: Rating given by customer (1-5)
        
        Returns:
            {
                "delivery_id": str,
                "delivery_boy_id": str,
                "base_amount": float,
                "distance_bonus": float,
                "on_time_bonus": float,
                "rating_bonus": float,
                "total_amount": float,
                "timestamp": datetime
            }
        """
        try:
            # Base delivery rate
            base_amount = BASE_DELIVERY_RATE
            
            # Distance bonus: 0.5₹ per km
            distance_bonus = delivery_distance_km * 0.5
            
            # On-time bonus: 5% of base
            on_time_bonus = (base_amount * ON_TIME_BONUS_RATE) if is_on_time else 0
            
            # Rating bonus: ₹10 if rating > 4.5
            rating_bonus = 0
            if delivery_rating and delivery_rating > 4.5:
                rating_bonus = RATING_BONUS
            
            # Calculate total
            total_amount = base_amount + distance_bonus + on_time_bonus + rating_bonus
            
            # Record earning
            earning_record = {
                "delivery_boy_id": delivery_boy_id,
                "delivery_id": delivery_id,
                "earning_type": EarningType.BASE_DELIVERY,
                "base_amount": round(base_amount, 2),
                "distance_km": round(delivery_distance_km, 2),
                "distance_bonus": round(distance_bonus, 2),
                "on_time_bonus": round(on_time_bonus, 2),
                "rating_bonus": round(rating_bonus, 2),
                "total_amount": round(total_amount, 2),
                "is_on_time": is_on_time,
                "rating": delivery_rating,
                "created_at": datetime.now().isoformat(),
                "status": "completed"
            }
            
            # Insert into database
            await db.staff_earnings.insert_one(earning_record)
            
            # Update staff wallet
            await EarningsEngine.update_staff_wallet(delivery_boy_id, total_amount)
            
            return earning_record
        
        except Exception as e:
            raise Exception(f"Failed to calculate delivery earnings: {str(e)}")
    
    @staticmethod
    async def update_staff_wallet(
        delivery_boy_id: str,
        amount: float,
        earning_type: EarningType = EarningType.BASE_DELIVERY,
        description: str = ""
    ) -> Dict[str, Any]:
        """
        Update staff wallet balance
        
        Args:
            delivery_boy_id: ID of delivery boy
            amount: Amount to add (positive) or subtract (negative)
            earning_type: Type of earning/deduction
            description: Description of transaction
        
        Returns:
            Updated wallet record
        """
        try:
            # Get or create wallet
            wallet = await db.staff_wallets.find_one({"delivery_boy_id": delivery_boy_id})
            
            if not wallet:
                # Create new wallet
                wallet = {
                    "delivery_boy_id": delivery_boy_id,
                    "balance": 0,
                    "total_earned": 0,
                    "total_paid_out": 0,
                    "created_at": datetime.now().isoformat()
                }
                await db.staff_wallets.insert_one(wallet)
            
            # Update balance
            new_balance = wallet.get("balance", 0) + amount
            
            if amount > 0:
                new_total_earned = wallet.get("total_earned", 0) + amount
            else:
                new_total_earned = wallet.get("total_earned", 0)
            
            # Update wallet
            updated_wallet = await db.staff_wallets.find_one_and_update(
                {"delivery_boy_id": delivery_boy_id},
                {
                    "$set": {
                        "balance": round(new_balance, 2),
                        "total_earned": round(new_total_earned, 2),
                        "last_updated": datetime.now().isoformat()
                    },
                    "$push": {
                        "transactions": {
                            "type": earning_type,
                            "amount": round(amount, 2),
                            "description": description,
                            "timestamp": datetime.now().isoformat(),
                            "balance_after": round(new_balance, 2)
                        }
                    }
                },
                return_document=True
            )
            
            return updated_wallet
        
        except Exception as e:
            raise Exception(f"Failed to update staff wallet: {str(e)}")
    
    @staticmethod
    async def calculate_monthly_bonuses(delivery_boy_id: str, year: int, month: int) -> Dict[str, Any]:
        """
        Calculate monthly performance bonuses
        
        Bonuses:
        1. On-time bonus: 5% of earnings if >95% on-time rate
        2. Rating bonus: ₹10 per delivery if avg rating >4.5
        3. Completion bonus: ₹100 if >20 deliveries/day on average
        
        Args:
            delivery_boy_id: ID of delivery boy
            year: Year (e.g., 2024)
            month: Month (1-12)
        
        Returns:
            {
                "delivery_boy_id": str,
                "month": int,
                "year": int,
                "total_deliveries": int,
                "on_time_count": int,
                "on_time_rate": float,
                "avg_rating": float,
                "total_earnings": float,
                "on_time_bonus": float,
                "rating_bonus": float,
                "completion_bonus": float,
                "total_bonus": float
            }
        """
        try:
            # Get month date range
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month + 1, 1)
            
            # Get all deliveries for month
            pipeline = [
                {
                    "$match": {
                        "delivery_boy_id": delivery_boy_id,
                        "created_at": {
                            "$gte": start_date.isoformat(),
                            "$lt": end_date.isoformat()
                        }
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total_deliveries": {"$sum": 1},
                        "on_time_count": {
                            "$sum": {"$cond": ["$is_on_time", 1, 0]}
                        },
                        "total_earnings": {"$sum": "$total_amount"},
                        "avg_rating": {"$avg": "$rating"}
                    }
                }
            ]
            
            result = await db.staff_earnings.aggregate(pipeline).to_list(1)
            
            if not result:
                return {
                    "delivery_boy_id": delivery_boy_id,
                    "month": month,
                    "year": year,
                    "total_deliveries": 0,
                    "total_bonus": 0
                }
            
            stats = result[0]
            total_deliveries = stats.get("total_deliveries", 0)
            on_time_count = stats.get("on_time_count", 0)
            total_earnings = stats.get("total_earnings", 0)
            avg_rating = stats.get("avg_rating", 0)
            
            # Calculate bonuses
            on_time_rate = (on_time_count / total_deliveries) if total_deliveries > 0 else 0
            on_time_bonus = (total_earnings * ON_TIME_BONUS_RATE) if on_time_rate > 0.95 else 0
            
            rating_bonus = 0
            if avg_rating > 4.5:
                rating_bonus = RATING_BONUS * total_deliveries
            
            # Completion bonus: ₹100 per day if >20 deliveries/day avg
            days_in_month = (end_date - start_date).days
            avg_per_day = total_deliveries / days_in_month if days_in_month > 0 else 0
            completion_bonus = (100 * days_in_month) if avg_per_day > 20 else 0
            
            # Total bonus (capped)
            total_bonus = min(on_time_bonus + rating_bonus + completion_bonus, MAX_MONTHLY_BONUS)
            
            bonus_record = {
                "delivery_boy_id": delivery_boy_id,
                "month": month,
                "year": year,
                "total_deliveries": total_deliveries,
                "on_time_count": on_time_count,
                "on_time_rate": round(on_time_rate, 4),
                "avg_rating": round(avg_rating, 2),
                "total_earnings": round(total_earnings, 2),
                "on_time_bonus": round(on_time_bonus, 2),
                "rating_bonus": round(rating_bonus, 2),
                "completion_bonus": round(completion_bonus, 2),
                "total_bonus": round(total_bonus, 2),
                "created_at": datetime.now().isoformat()
            }
            
            # Store bonus record
            await db.monthly_bonuses.insert_one(bonus_record)
            
            # Add bonus to wallet
            await EarningsEngine.update_staff_wallet(
                delivery_boy_id,
                total_bonus,
                EarningType.ON_TIME_BONUS,
                f"Monthly bonus for {year}-{month:02d}"
            )
            
            return bonus_record
        
        except Exception as e:
            raise Exception(f"Failed to calculate monthly bonuses: {str(e)}")
    
    @staticmethod
    async def request_payout(
        delivery_boy_id: str,
        amount: float,
        payment_method: str = "bank_transfer"
    ) -> Dict[str, Any]:
        """
        Request a payout from wallet
        
        Args:
            delivery_boy_id: ID of delivery boy
            amount: Amount requested
            payment_method: "bank_transfer" or "upi"
        
        Returns:
            Payout request record
        """
        try:
            # Validate amount
            if amount < PAYOUT_MIN_AMOUNT:
                raise ValueError(f"Minimum payout amount is ₹{PAYOUT_MIN_AMOUNT}")
            
            # Get wallet
            wallet = await db.staff_wallets.find_one({"delivery_boy_id": delivery_boy_id})
            if not wallet:
                raise ValueError("Wallet not found")
            
            # Check balance
            if wallet.get("balance", 0) < amount:
                raise ValueError("Insufficient balance")
            
            # Create payout request
            payout_request = {
                "delivery_boy_id": delivery_boy_id,
                "amount": round(amount, 2),
                "payment_method": payment_method,
                "status": PayoutStatus.PENDING,
                "requested_at": datetime.now().isoformat(),
                "approved_at": None,
                "processed_at": None,
                "transaction_id": None
            }
            
            await db.payout_requests.insert_one(payout_request)
            
            # Update wallet (reserve amount)
            await db.staff_wallets.update_one(
                {"delivery_boy_id": delivery_boy_id},
                {
                    "$set": {
                        "balance": wallet.get("balance", 0) - amount,
                        "pending_payout": wallet.get("pending_payout", 0) + amount
                    }
                }
            )
            
            return payout_request
        
        except Exception as e:
            raise Exception(f"Failed to create payout request: {str(e)}")
    
    @staticmethod
    async def approve_payout(payout_id: str, admin_id: str) -> Dict[str, Any]:
        """
        Admin approval of payout request
        
        Args:
            payout_id: ID of payout request
            admin_id: ID of admin approving
        
        Returns:
            Updated payout record
        """
        try:
            payout = await db.payout_requests.find_one_and_update(
                {"_id": payout_id},
                {
                    "$set": {
                        "status": PayoutStatus.APPROVED,
                        "approved_at": datetime.now().isoformat(),
                        "approved_by": admin_id
                    }
                },
                return_document=True
            )
            
            return payout
        
        except Exception as e:
            raise Exception(f"Failed to approve payout: {str(e)}")
    
    @staticmethod
    async def process_payout(payout_id: str) -> Dict[str, Any]:
        """
        Process approved payout (send money)
        
        Args:
            payout_id: ID of payout request
        
        Returns:
            Updated payout record with transaction ID
        """
        try:
            payout = await db.payout_requests.find_one({"_id": payout_id})
            if not payout:
                raise ValueError("Payout request not found")
            
            if payout.get("status") != PayoutStatus.APPROVED:
                raise ValueError("Payout must be approved first")
            
            # Generate transaction ID
            transaction_id = f"TXN_{payout_id}_{datetime.now().timestamp()}"
            
            # Update payout
            updated_payout = await db.payout_requests.find_one_and_update(
                {"_id": payout_id},
                {
                    "$set": {
                        "status": PayoutStatus.PROCESSING,
                        "transaction_id": transaction_id,
                        "processed_at": datetime.now().isoformat()
                    }
                },
                return_document=True
            )
            
            # TODO: Integrate with payment gateway (Razorpay, etc.)
            
            # Mark as completed
            final_payout = await db.payout_requests.find_one_and_update(
                {"_id": payout_id},
                {
                    "$set": {
                        "status": PayoutStatus.COMPLETED,
                        "completed_at": datetime.now().isoformat()
                    }
                },
                return_document=True
            )
            
            # Update wallet
            delivery_boy_id = payout.get("delivery_boy_id")
            await db.staff_wallets.update_one(
                {"delivery_boy_id": delivery_boy_id},
                {
                    "$set": {
                        "pending_payout": payout.get("balance", 0) - payout.get("amount", 0)
                    },
                    "$inc": {
                        "total_paid_out": payout.get("amount", 0)
                    }
                }
            )
            
            return final_payout
        
        except Exception as e:
            raise Exception(f"Failed to process payout: {str(e)}")
    
    @staticmethod
    async def get_staff_earnings(delivery_boy_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get earnings for a staff member (last N days)
        
        Args:
            delivery_boy_id: ID of delivery boy
            days: Number of days to retrieve (default 30)
        
        Returns:
            List of earning records
        """
        try:
            start_date = datetime.now() - timedelta(days=days)
            
            earnings = await db.staff_earnings.find(
                {
                    "delivery_boy_id": delivery_boy_id,
                    "created_at": {"$gte": start_date.isoformat()}
                }
            ).sort("created_at", -1).to_list(None)
            
            # Remove MongoDB _id field
            for earning in earnings:
                earning.pop("_id", None)
            
            return earnings
        
        except Exception as e:
            raise Exception(f"Failed to fetch staff earnings: {str(e)}")
    
    @staticmethod
    async def get_staff_wallet(delivery_boy_id: str) -> Dict[str, Any]:
        """
        Get staff wallet details
        
        Args:
            delivery_boy_id: ID of delivery boy
        
        Returns:
            Wallet record with balance and stats
        """
        try:
            wallet = await db.staff_wallets.find_one({"delivery_boy_id": delivery_boy_id})
            
            if not wallet:
                return {
                    "delivery_boy_id": delivery_boy_id,
                    "balance": 0,
                    "total_earned": 0,
                    "total_paid_out": 0,
                    "pending_payout": 0
                }
            
            wallet.pop("_id", None)
            wallet.pop("transactions", None)  # Don't include full transaction history
            
            return wallet
        
        except Exception as e:
            raise Exception(f"Failed to fetch wallet: {str(e)}")
    
    @staticmethod
    async def get_payout_history(delivery_boy_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get payout request history
        
        Args:
            delivery_boy_id: ID of delivery boy
            limit: Max records to return
        
        Returns:
            List of payout requests
        """
        try:
            payouts = await db.payout_requests.find(
                {"delivery_boy_id": delivery_boy_id}
            ).sort("requested_at", -1).limit(limit).to_list(limit)
            
            for payout in payouts:
                payout.pop("_id", None)
            
            return payouts
        
        except Exception as e:
            raise Exception(f"Failed to fetch payout history: {str(e)}")
    
    @staticmethod
    async def generate_earning_statement(
        delivery_boy_id: str,
        year: int,
        month: int
    ) -> Dict[str, Any]:
        """
        Generate monthly earning statement
        
        Args:
            delivery_boy_id: ID of delivery boy
            year: Year
            month: Month
        
        Returns:
            Complete earning statement
        """
        try:
            # Get month date range
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month + 1, 1)
            
            # Get earnings
            earnings = await db.staff_earnings.find(
                {
                    "delivery_boy_id": delivery_boy_id,
                    "created_at": {
                        "$gte": start_date.isoformat(),
                        "$lt": end_date.isoformat()
                    }
                }
            ).to_list(None)
            
            # Get bonus
            bonus = await db.monthly_bonuses.find_one({
                "delivery_boy_id": delivery_boy_id,
                "month": month,
                "year": year
            })
            
            # Calculate totals
            total_base = sum(e.get("base_amount", 0) for e in earnings)
            total_distance_bonus = sum(e.get("distance_bonus", 0) for e in earnings)
            total_on_time_bonus = sum(e.get("on_time_bonus", 0) for e in earnings)
            total_rating_bonus = sum(e.get("rating_bonus", 0) for e in earnings)
            total_deliveries = len(earnings)
            
            # Get payouts for month
            payouts = await db.payout_requests.find(
                {
                    "delivery_boy_id": delivery_boy_id,
                    "requested_at": {
                        "$gte": start_date.isoformat(),
                        "$lt": end_date.isoformat()
                    },
                    "status": PayoutStatus.COMPLETED
                }
            ).to_list(None)
            
            total_paid_out = sum(p.get("amount", 0) for p in payouts)
            
            statement = {
                "delivery_boy_id": delivery_boy_id,
                "month": month,
                "year": year,
                "period": f"{year}-{month:02d}",
                "summary": {
                    "total_deliveries": total_deliveries,
                    "total_base_earnings": round(total_base, 2),
                    "total_distance_bonus": round(total_distance_bonus, 2),
                    "total_on_time_bonus": round(total_on_time_bonus, 2),
                    "total_rating_bonus": round(total_rating_bonus, 2),
                    "subtotal_from_deliveries": round(
                        total_base + total_distance_bonus + total_on_time_bonus + total_rating_bonus, 2
                    )
                },
                "bonuses": {
                    "monthly_on_time_bonus": bonus.get("on_time_bonus", 0) if bonus else 0,
                    "monthly_rating_bonus": bonus.get("rating_bonus", 0) if bonus else 0,
                    "monthly_completion_bonus": bonus.get("completion_bonus", 0) if bonus else 0,
                    "total_monthly_bonus": bonus.get("total_bonus", 0) if bonus else 0
                },
                "payouts": {
                    "total_paid_out": round(total_paid_out, 2),
                    "payout_count": len(payouts)
                },
                "grand_total": round(
                    total_base + total_distance_bonus + total_on_time_bonus + total_rating_bonus +
                    (bonus.get("total_bonus", 0) if bonus else 0),
                    2
                ),
                "generated_at": datetime.now().isoformat()
            }
            
            return statement
        
        except Exception as e:
            raise Exception(f"Failed to generate earning statement: {str(e)}")


# Export for use in routes
__all__ = ["EarningsEngine", "EarningType", "PayoutStatus"]

# Phase 1.5: Delivery Boy System - Earnings Tracking Engine
# Tracks delivery boy performance, deliveries, and earnings

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class DeliveryBoyStatus(str, Enum):
    """Delivery boy status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"
    SUSPENDED = "suspended"


class EarningsTracker:
    """
    Manages delivery boy earnings tracking.
    
    Tracks:
    - Daily deliveries
    - Weekly deliveries
    - Monthly deliveries
    - Corresponding earnings
    - Performance metrics
    """
    
    def __init__(self, db):
        self.db = db
        self.logger = logger
    
    async def get_delivery_boy(self, delivery_boy_id: str) -> Optional[Dict[str, Any]]:
        """Get delivery boy by ID"""
        boy = await self.db.delivery_boys.find_one(
            {"id": delivery_boy_id},
            {"_id": 0}
        )
        return boy
    
    async def get_delivery_boy_from_users(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get delivery boy from users collection"""
        user = await self.db.users.find_one(
            {"id": user_id, "role": "delivery_boy"},
            {"_id": 0}
        )
        return user
    
    async def initialize_delivery_boy_earnings(
        self,
        delivery_boy_id: str,
        delivery_boy_data: Dict[str, Any]
    ) -> bool:
        """
        Initialize earnings fields when delivery boy is created/updated.
        """
        try:
            earnings_fields = {
                "total_deliveries": 0,
                "today_deliveries": 0,
                "week_deliveries": 0,
                "month_deliveries": 0,
                
                "total_earnings": 0,
                "today_earnings": 0.0,
                "week_earnings": 0.0,
                "month_earnings": 0.0,
                
                "last_payment_date": None,
                "last_payment_amount": 0,
                
                "payment_frequency": "weekly",  # weekly, biweekly, monthly
                "status": DeliveryBoyStatus.ACTIVE,
                
                "earnings_history": [],
                "created_at": datetime.now()
            }
            
            result = await self.db.delivery_boys.update_one(
                {"id": delivery_boy_id},
                {"$set": earnings_fields},
                upsert=False
            )
            
            if result.modified_count > 0 or result.upserted_id:
                self.logger.info(f"[EARNINGS] Initialized delivery boy {delivery_boy_id}")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error initializing earnings for {delivery_boy_id}: {str(e)}")
            return False
    
    async def record_delivery(
        self,
        delivery_boy_id: str,
        order_id: str,
        amount_earned: float = 50  # Default commission per delivery
    ) -> bool:
        """
        Record a delivery and update earnings.
        Called when delivery is marked as complete.
        
        Args:
            delivery_boy_id: ID of delivery boy
            order_id: Order being delivered
            amount_earned: Commission earned for this delivery (default ₹50)
        """
        try:
            now = datetime.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_start = now - timedelta(days=now.weekday())  # Monday
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Update earnings
            result = await self.db.delivery_boys.update_one(
                {"id": delivery_boy_id},
                {
                    "$inc": {
                        "total_deliveries": 1,
                        "today_deliveries": 1,
                        "week_deliveries": 1,
                        "month_deliveries": 1,
                        
                        "total_earnings": amount_earned,
                        "today_earnings": amount_earned,
                        "week_earnings": amount_earned,
                        "month_earnings": amount_earned
                    },
                    "$push": {
                        "earnings_history": {
                            "timestamp": now,
                            "order_id": order_id,
                            "amount": amount_earned,
                            "type": "delivery"
                        }
                    }
                }
            )
            
            if result.modified_count > 0:
                self.logger.info(
                    f"[EARNINGS] Recorded delivery for {delivery_boy_id}: "
                    f"Order {order_id}, +₹{amount_earned}"
                )
                
                # Check if daily/weekly/monthly totals reached bonus thresholds
                await self._check_bonuses(delivery_boy_id, now)
                
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error recording delivery for {delivery_boy_id}: {str(e)}")
            return False
    
    async def reset_daily_stats(self) -> int:
        """
        Reset daily stats for all delivery boys.
        Should be run daily at midnight.
        
        Returns: Number of delivery boys updated
        """
        try:
            result = await self.db.delivery_boys.update_many(
                {"status": DeliveryBoyStatus.ACTIVE},
                {
                    "$set": {
                        "today_deliveries": 0,
                        "today_earnings": 0.0
                    }
                }
            )
            
            updated = result.modified_count
            self.logger.info(f"[EARNINGS] Reset daily stats for {updated} delivery boys")
            return updated
            
        except Exception as e:
            self.logger.error(f"Error resetting daily stats: {str(e)}")
            return 0
    
    async def reset_weekly_stats(self) -> int:
        """
        Reset weekly stats (every Monday).
        """
        try:
            result = await self.db.delivery_boys.update_many(
                {"status": DeliveryBoyStatus.ACTIVE},
                {
                    "$set": {
                        "week_deliveries": 0,
                        "week_earnings": 0.0
                    }
                }
            )
            
            updated = result.modified_count
            self.logger.info(f"[EARNINGS] Reset weekly stats for {updated} delivery boys")
            return updated
            
        except Exception as e:
            self.logger.error(f"Error resetting weekly stats: {str(e)}")
            return 0
    
    async def reset_monthly_stats(self) -> int:
        """
        Reset monthly stats (on 1st of each month).
        """
        try:
            result = await self.db.delivery_boys.update_many(
                {"status": DeliveryBoyStatus.ACTIVE},
                {
                    "$set": {
                        "month_deliveries": 0,
                        "month_earnings": 0.0
                    }
                }
            )
            
            updated = result.modified_count
            self.logger.info(f"[EARNINGS] Reset monthly stats for {updated} delivery boys")
            return updated
            
        except Exception as e:
            self.logger.error(f"Error resetting monthly stats: {str(e)}")
            return 0
    
    async def _check_bonuses(self, delivery_boy_id: str, date: datetime) -> None:
        """
        Check if delivery boy reached bonus thresholds.
        
        Bonuses:
        - 10 deliveries/day: ₹100 bonus
        - 50 deliveries/week: ₹500 bonus
        - 200 deliveries/month: ₹2000 bonus
        """
        try:
            boy = await self.get_delivery_boy(delivery_boy_id)
            if not boy:
                return
            
            bonuses = []
            
            # Daily bonus
            if boy.get("today_deliveries", 0) == 10:
                bonuses.append({"type": "daily", "amount": 100})
            
            # Weekly bonus
            if boy.get("week_deliveries", 0) == 50:
                bonuses.append({"type": "weekly", "amount": 500})
            
            # Monthly bonus
            if boy.get("month_deliveries", 0) == 200:
                bonuses.append({"type": "monthly", "amount": 2000})
            
            # Record bonuses
            for bonus in bonuses:
                await self.db.delivery_boys.update_one(
                    {"id": delivery_boy_id},
                    {
                        "$inc": {
                            "total_earnings": bonus["amount"],
                            f"{bonus['type']}_earnings": bonus["amount"]
                        },
                        "$push": {
                            "earnings_history": {
                                "timestamp": date,
                                "amount": bonus["amount"],
                                "type": f"{bonus['type']}_bonus"
                            }
                        }
                    }
                )
                
                self.logger.info(
                    f"[EARNINGS] {delivery_boy_id} earned {bonus['type']} bonus: "
                    f"₹{bonus['amount']}"
                )
        
        except Exception as e:
            self.logger.error(f"Error checking bonuses: {str(e)}")
    
    async def get_earnings_summary(self, delivery_boy_id: str) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive earnings summary for a delivery boy.
        
        Returns:
        {
            "id": "BOY_001",
            "name": "Arjun Kumar",
            "phone": "9876543210",
            "status": "active",
            
            "today": {
                "deliveries": 12,
                "earnings": 600,
                "average_per_delivery": 50
            },
            
            "week": {
                "deliveries": 65,
                "earnings": 3250,
                "average_per_delivery": 50
            },
            
            "month": {
                "deliveries": 250,
                "earnings": 12500,
                "average_per_delivery": 50
            },
            
            "lifetime": {
                "deliveries": 1250,
                "earnings": 62500,
                "average_per_delivery": 50
            },
            
            "payment_info": {
                "last_payment_date": "2026-01-25",
                "last_payment_amount": 5000,
                "frequency": "weekly"
            }
        }
        """
        try:
            boy = await self.get_delivery_boy(delivery_boy_id)
            if not boy:
                return None
            
            today_deliveries = boy.get("today_deliveries", 0) or 1
            week_deliveries = boy.get("week_deliveries", 0) or 1
            month_deliveries = boy.get("month_deliveries", 0) or 1
            total_deliveries = boy.get("total_deliveries", 0) or 1
            
            return {
                "id": boy.get("id"),
                "name": boy.get("name"),
                "phone": boy.get("phone"),
                "status": boy.get("status"),
                
                "today": {
                    "deliveries": boy.get("today_deliveries", 0),
                    "earnings": boy.get("today_earnings", 0),
                    "average_per_delivery": round(
                        boy.get("today_earnings", 0) / today_deliveries, 2
                    ) if today_deliveries > 0 else 0
                },
                
                "week": {
                    "deliveries": boy.get("week_deliveries", 0),
                    "earnings": boy.get("week_earnings", 0),
                    "average_per_delivery": round(
                        boy.get("week_earnings", 0) / week_deliveries, 2
                    ) if week_deliveries > 0 else 0
                },
                
                "month": {
                    "deliveries": boy.get("month_deliveries", 0),
                    "earnings": boy.get("month_earnings", 0),
                    "average_per_delivery": round(
                        boy.get("month_earnings", 0) / month_deliveries, 2
                    ) if month_deliveries > 0 else 0
                },
                
                "lifetime": {
                    "deliveries": boy.get("total_deliveries", 0),
                    "earnings": boy.get("total_earnings", 0),
                    "average_per_delivery": round(
                        boy.get("total_earnings", 0) / total_deliveries, 2
                    ) if total_deliveries > 0 else 0
                },
                
                "payment_info": {
                    "last_payment_date": boy.get("last_payment_date"),
                    "last_payment_amount": boy.get("last_payment_amount", 0),
                    "frequency": boy.get("payment_frequency", "weekly")
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error getting earnings summary: {str(e)}")
            return None
    
    async def get_top_performers(
        self,
        period: str = "week",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get top performing delivery boys.
        
        Args:
            period: "day", "week", or "month"
            limit: Number of top performers to return
        
        Returns: List of top performers with earnings
        """
        try:
            field = f"{period}_deliveries" if period != "month" else "month_deliveries"
            
            pipeline = [
                {"$match": {"status": DeliveryBoyStatus.ACTIVE}},
                {
                    "$project": {
                        "_id": 0,
                        "id": 1,
                        "name": 1,
                        "phone": 1,
                        "deliveries": f"${field}",
                        "earnings": f"${period}_earnings" if period != "month" else "$month_earnings"
                    }
                },
                {"$sort": {"deliveries": -1}},
                {"$limit": limit}
            ]
            
            results = await self.db.delivery_boys.aggregate(pipeline).to_list(limit)
            return results
            
        except Exception as e:
            self.logger.error(f"Error getting top performers: {str(e)}")
            return []
    
    async def get_earnings_statistics(self) -> Dict[str, Any]:
        """
        Get overall earnings statistics for all delivery boys.
        """
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "total_delivery_boys": {"$sum": 1},
                        "active_count": {
                            "$sum": {
                                "$cond": [{"$eq": ["$status", DeliveryBoyStatus.ACTIVE]}, 1, 0]
                            }
                        },
                        "total_deliveries": {"$sum": "$total_deliveries"},
                        "total_earnings": {"$sum": "$total_earnings"},
                        "avg_earnings_per_boy": {"$avg": "$total_earnings"},
                        "today_deliveries": {"$sum": "$today_deliveries"},
                        "today_earnings": {"$sum": "$today_earnings"},
                        "week_deliveries": {"$sum": "$week_deliveries"},
                        "week_earnings": {"$sum": "$week_earnings"},
                        "month_deliveries": {"$sum": "$month_deliveries"},
                        "month_earnings": {"$sum": "$month_earnings"}
                    }
                }
            ]
            
            results = await self.db.delivery_boys.aggregate(pipeline).to_list(1)
            
            if results:
                stats = results[0]
                return {
                    "total_delivery_boys": stats.get("total_delivery_boys", 0),
                    "active_count": stats.get("active_count", 0),
                    
                    "lifetime": {
                        "total_deliveries": stats.get("total_deliveries", 0),
                        "total_earnings": stats.get("total_earnings", 0),
                        "avg_per_boy": round(stats.get("avg_earnings_per_boy", 0), 2)
                    },
                    
                    "today": {
                        "deliveries": stats.get("today_deliveries", 0),
                        "earnings": stats.get("today_earnings", 0)
                    },
                    
                    "week": {
                        "deliveries": stats.get("week_deliveries", 0),
                        "earnings": stats.get("week_earnings", 0)
                    },
                    
                    "month": {
                        "deliveries": stats.get("month_deliveries", 0),
                        "earnings": stats.get("month_earnings", 0)
                    }
                }
            
            return {}
            
        except Exception as e:
            self.logger.error(f"Error getting earnings statistics: {str(e)}")
            return {}


# Export
__all__ = ["EarningsTracker", "DeliveryBoyStatus"]

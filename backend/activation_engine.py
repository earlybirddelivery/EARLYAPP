# Phase 1.4: Customer Activation Engine
# Tracks customer journey: new → onboarded → active → engaged → inactive → churned

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class ActivationStatus(str, Enum):
    """Customer activation status at different stages of journey"""
    NEW = "new"                    # Just signed up, no order yet
    ONBOARDED = "onboarded"        # Placed first order
    ACTIVE = "active"              # Recent activity (within 30 days)
    ENGAGED = "engaged"            # 3+ orders or regular subscriber
    INACTIVE = "inactive"          # No activity for 30+ days
    CHURNED = "churned"            # No activity for 60+ days


class ActivationEngine:
    """
    Manages customer activation pipeline.
    
    Tracks when customers transition through activation states and handles
    notifications/actions for each state change.
    """
    
    def __init__(self, db):
        self.db = db
        self.logger = logger
    
    async def get_customer_status(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Get current activation status for a customer"""
        customer = await self.db.customers_v2.find_one(
            {"id": customer_id},
            {"_id": 0}
        )
        return customer
    
    async def initialize_customer_activation(
        self,
        customer_id: str,
        customer_data: Dict[str, Any]
    ) -> bool:
        """
        Initialize activation fields when customer is created.
        Called during customer signup.
        """
        try:
            activation_fields = {
                "activation_status": ActivationStatus.NEW,
                "signup_date": datetime.now(),
                "first_order_date": None,
                "first_delivery_date": None,
                "last_contact_date": None,
                "last_order_date": None,
                "first_contact_date": None,
                "churn_date": None,
                "onboarding_completed": False,
                "welcome_message_sent": False,
                "activation_events": []  # Track all state transitions
            }
            
            result = await self.db.customers_v2.update_one(
                {"id": customer_id},
                {"$set": activation_fields}
            )
            
            if result.modified_count > 0:
                self.logger.info(f"[ACTIVATION] Initialized activation for customer {customer_id}")
                
                # Record event
                await self._record_event(
                    customer_id,
                    "ACTIVATION_INITIALIZED",
                    {
                        "status": ActivationStatus.NEW,
                        "signup_date": datetime.now()
                    }
                )
                
                return True
            return False
            
        except Exception as e:
            self.logger.error(f"Error initializing activation for {customer_id}: {str(e)}")
            return False
    
    async def handle_first_order(
        self,
        customer_id: str,
        order_id: str,
        order_amount: float = 0
    ) -> bool:
        """
        Handle customer's first order.
        Transitions: new → onboarded
        """
        try:
            customer = await self.get_customer_status(customer_id)
            if not customer:
                self.logger.warning(f"Customer not found: {customer_id}")
                return False
            
            current_status = customer.get("activation_status", ActivationStatus.NEW)
            
            # Only update if currently in NEW status (hasn't ordered before)
            if current_status == ActivationStatus.NEW:
                result = await self.db.customers_v2.update_one(
                    {"id": customer_id},
                    {
                        "$set": {
                            "activation_status": ActivationStatus.ONBOARDED,
                            "first_order_date": datetime.now(),
                            "last_order_date": datetime.now(),
                            "last_contact_date": datetime.now()
                        },
                        "$push": {
                            "activation_events": {
                                "event": "FIRST_ORDER_PLACED",
                                "timestamp": datetime.now(),
                                "order_id": order_id,
                                "amount": order_amount
                            }
                        }
                    }
                )
                
                if result.modified_count > 0:
                    self.logger.info(
                        f"[ACTIVATION] Customer {customer_id} moved to ONBOARDED "
                        f"(Order: {order_id}, Amount: ₹{order_amount})"
                    )
                    return True
            else:
                # Customer already has orders, just update last_order_date
                await self.db.customers_v2.update_one(
                    {"id": customer_id},
                    {
                        "$set": {"last_order_date": datetime.now()},
                        "$push": {
                            "activation_events": {
                                "event": "ORDER_PLACED",
                                "timestamp": datetime.now(),
                                "order_id": order_id,
                                "amount": order_amount
                            }
                        }
                    }
                )
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error handling first order for {customer_id}: {str(e)}")
            return False
    
    async def handle_first_delivery(
        self,
        customer_id: str,
        order_id: str
    ) -> bool:
        """
        Handle customer's first delivery.
        Transitions: onboarded → active
        """
        try:
            customer = await self.get_customer_status(customer_id)
            if not customer:
                self.logger.warning(f"Customer not found: {customer_id}")
                return False
            
            current_status = customer.get("activation_status")
            first_delivery = customer.get("first_delivery_date")
            
            # If this is first delivery ever
            if not first_delivery:
                result = await self.db.customers_v2.update_one(
                    {"id": customer_id},
                    {
                        "$set": {
                            "activation_status": ActivationStatus.ACTIVE,
                            "first_delivery_date": datetime.now(),
                            "last_contact_date": datetime.now(),
                            "onboarding_completed": True
                        },
                        "$push": {
                            "activation_events": {
                                "event": "FIRST_DELIVERY_COMPLETED",
                                "timestamp": datetime.now(),
                                "order_id": order_id
                            }
                        }
                    }
                )
                
                if result.modified_count > 0:
                    self.logger.info(
                        f"[ACTIVATION] Customer {customer_id} moved to ACTIVE "
                        f"(First delivery: {order_id})"
                    )
                    return True
            else:
                # Not first delivery, just update last_contact
                await self.db.customers_v2.update_one(
                    {"id": customer_id},
                    {
                        "$set": {"last_contact_date": datetime.now()},
                        "$push": {
                            "activation_events": {
                                "event": "DELIVERY_COMPLETED",
                                "timestamp": datetime.now(),
                                "order_id": order_id
                            }
                        }
                    }
                )
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error handling first delivery for {customer_id}: {str(e)}")
            return False
    
    async def check_and_update_status(self, customer_id: str) -> Optional[str]:
        """
        Check customer activity and update status based on inactivity rules.
        - Active if recent activity (< 30 days)
        - Inactive if no activity (30-60 days)
        - Churned if no activity (> 60 days)
        
        Returns: New status if changed, None if unchanged
        """
        try:
            customer = await self.get_customer_status(customer_id)
            if not customer:
                return None
            
            current_status = customer.get("activation_status")
            last_contact = customer.get("last_contact_date")
            
            if not last_contact:
                return None
            
            now = datetime.now()
            days_since_contact = (now - last_contact).days
            
            new_status = None
            
            # Determine new status based on inactivity
            if current_status in [ActivationStatus.ACTIVE, ActivationStatus.ENGAGED]:
                if days_since_contact >= 60:
                    new_status = ActivationStatus.CHURNED
                elif days_since_contact >= 30:
                    new_status = ActivationStatus.INACTIVE
            
            elif current_status == ActivationStatus.INACTIVE:
                if days_since_contact >= 60:
                    new_status = ActivationStatus.CHURNED
                elif days_since_contact < 30:
                    new_status = ActivationStatus.ACTIVE
            
            # Update if status changed
            if new_status and new_status != current_status:
                result = await self.db.customers_v2.update_one(
                    {"id": customer_id},
                    {
                        "$set": {"activation_status": new_status},
                        "$push": {
                            "activation_events": {
                                "event": "STATUS_UPDATED",
                                "timestamp": datetime.now(),
                                "from_status": current_status,
                                "to_status": new_status,
                                "days_since_contact": days_since_contact
                            }
                        }
                    }
                )
                
                if result.modified_count > 0:
                    self.logger.info(
                        f"[ACTIVATION] Customer {customer_id} status changed "
                        f"{current_status} → {new_status} ({days_since_contact} days inactive)"
                    )
                    
                    # If became inactive or churned, record churn date
                    if new_status in [ActivationStatus.CHURNED, ActivationStatus.INACTIVE]:
                        await self.db.customers_v2.update_one(
                            {"id": customer_id},
                            {"$set": {"churn_date": now}}
                        )
                    
                    return new_status
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error checking status for {customer_id}: {str(e)}")
            return None
    
    async def _record_event(
        self,
        customer_id: str,
        event_type: str,
        event_data: Dict[str, Any]
    ):
        """Record activation event in audit trail"""
        try:
            event = {
                "customer_id": customer_id,
                "event_type": event_type,
                "timestamp": datetime.now(),
                "data": event_data
            }
            await self.db.activation_events.insert_one(event)
        except Exception as e:
            self.logger.error(f"Error recording event: {str(e)}")
    
    async def get_activation_metrics(self) -> Dict[str, Any]:
        """
        Get overall activation metrics for dashboard.
        
        Returns:
        {
            "total_customers": 1000,
            "new": 50,
            "onboarded": 200,
            "active": 600,
            "engaged": 100,
            "inactive": 40,
            "churned": 10,
            "conversion_funnel": {
                "signup_to_first_order": "25%",
                "first_order_to_active": "75%"
            }
        }
        """
        try:
            # Get counts by status
            pipeline = [
                {
                    "$group": {
                        "_id": "$activation_status",
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            results = await self.db.customers_v2.aggregate(pipeline).to_list(None)
            status_counts = {item["_id"]: item["count"] for item in results}
            
            total = sum(status_counts.values())
            
            metrics = {
                "total_customers": total,
                "new": status_counts.get(ActivationStatus.NEW, 0),
                "onboarded": status_counts.get(ActivationStatus.ONBOARDED, 0),
                "active": status_counts.get(ActivationStatus.ACTIVE, 0),
                "engaged": status_counts.get(ActivationStatus.ENGAGED, 0),
                "inactive": status_counts.get(ActivationStatus.INACTIVE, 0),
                "churned": status_counts.get(ActivationStatus.CHURNED, 0),
            }
            
            # Calculate conversion funnels
            new_count = metrics["new"]
            onboarded_count = metrics["onboarded"]
            active_count = metrics["active"]
            
            metrics["conversion_funnel"] = {
                "signup_to_first_order": (
                    f"{(onboarded_count / total * 100):.1f}%" if total > 0 else "0%"
                ),
                "first_order_to_active": (
                    f"{(active_count / onboarded_count * 100):.1f}%" if onboarded_count > 0 else "0%"
                ),
                "overall_activation": (
                    f"{((active_count + metrics['engaged']) / total * 100):.1f}%" if total > 0 else "0%"
                )
            }
            
            self.logger.info(f"[ACTIVATION METRICS] {metrics}")
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error getting metrics: {str(e)}")
            return {}
    
    async def get_customer_timeline(self, customer_id: str) -> List[Dict[str, Any]]:
        """Get activation timeline for a specific customer"""
        try:
            customer = await self.get_customer_status(customer_id)
            if not customer:
                return []
            
            timeline = []
            
            # Signup event
            if signup_date := customer.get("signup_date"):
                timeline.append({
                    "event": "SIGNUP",
                    "timestamp": signup_date,
                    "status": ActivationStatus.NEW
                })
            
            # First order event
            if first_order_date := customer.get("first_order_date"):
                timeline.append({
                    "event": "FIRST_ORDER",
                    "timestamp": first_order_date,
                    "status": ActivationStatus.ONBOARDED
                })
            
            # First delivery event
            if first_delivery_date := customer.get("first_delivery_date"):
                timeline.append({
                    "event": "FIRST_DELIVERY",
                    "timestamp": first_delivery_date,
                    "status": ActivationStatus.ACTIVE
                })
            
            # Recorded activation events
            if events := customer.get("activation_events"):
                for event in events:
                    timeline.append({
                        "event": event.get("event"),
                        "timestamp": event.get("timestamp"),
                        "details": event
                    })
            
            # Churn event
            if churn_date := customer.get("churn_date"):
                timeline.append({
                    "event": "CHURN",
                    "timestamp": churn_date,
                    "status": ActivationStatus.CHURNED
                })
            
            # Sort by timestamp
            timeline.sort(key=lambda x: x["timestamp"])
            
            return timeline
            
        except Exception as e:
            self.logger.error(f"Error getting timeline for {customer_id}: {str(e)}")
            return []


# Export for use in routes
__all__ = ["ActivationEngine", "ActivationStatus"]

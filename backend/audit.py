"""
PHASE 0.4.6: Audit Trail Logging System
========================================

Comprehensive audit logging for all critical operations.
Tracks: Order creation/updates, delivery confirmations, billing changes
Records: user_id, timestamp, before/after values

Author: AI Agent
Date: January 27, 2026
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from database import db
import uuid
import json

class AuditLogger:
    """Audit trail logging for critical operations"""
    
    @staticmethod
    async def log_order_created(order_id: str, user_id: str, order_data: Dict[str, Any]):
        """Log order creation"""
        await AuditLogger._log_event(
            table="orders",
            record_id=order_id,
            action="CREATE",
            user_id=user_id,
            before=None,
            after=order_data
        )
    
    @staticmethod
    async def log_order_updated(order_id: str, user_id: str, before: Dict[str, Any], after: Dict[str, Any]):
        """Log order update"""
        await AuditLogger._log_event(
            table="orders",
            record_id=order_id,
            action="UPDATE",
            user_id=user_id,
            before=before,
            after=after
        )
    
    @staticmethod
    async def log_order_delivered(order_id: str, user_id: str, order_data: Dict[str, Any]):
        """Log delivery confirmation"""
        await AuditLogger._log_event(
            table="orders",
            record_id=order_id,
            action="DELIVERED",
            user_id=user_id,
            before={"status": "PENDING"},
            after={"status": "DELIVERED", "delivered_at": datetime.now(timezone.utc).isoformat()}
        )
    
    @staticmethod
    async def log_order_billed(order_id: str, user_id: str, month: str, billing_id: str):
        """Log order billing"""
        await AuditLogger._log_event(
            table="orders",
            record_id=order_id,
            action="BILLED",
            user_id=user_id,
            before={"billed": False},
            after={
                "billed": True,
                "billed_at": datetime.now(timezone.utc).isoformat(),
                "billed_month": month,
                "billing_record_id": billing_id
            }
        )
    
    @staticmethod
    async def log_delivery_status_created(delivery_id: str, user_id: str, delivery_data: Dict[str, Any]):
        """Log delivery status creation"""
        await AuditLogger._log_event(
            table="delivery_statuses",
            record_id=delivery_id,
            action="CREATE",
            user_id=user_id,
            before=None,
            after=delivery_data
        )
    
    @staticmethod
    async def log_delivery_status_updated(delivery_id: str, user_id: str, before: Dict[str, Any], after: Dict[str, Any]):
        """Log delivery status update"""
        await AuditLogger._log_event(
            table="delivery_statuses",
            record_id=delivery_id,
            action="UPDATE",
            user_id=user_id,
            before=before,
            after=after
        )
    
    @staticmethod
    async def log_billing_created(billing_id: str, user_id: str, billing_data: Dict[str, Any]):
        """Log billing record creation"""
        await AuditLogger._log_event(
            table="billing_records",
            record_id=billing_id,
            action="CREATE",
            user_id=user_id,
            before=None,
            after=billing_data
        )
    
    @staticmethod
    async def log_billing_updated(billing_id: str, user_id: str, before: Dict[str, Any], after: Dict[str, Any]):
        """Log billing record update"""
        await AuditLogger._log_event(
            table="billing_records",
            record_id=billing_id,
            action="UPDATE",
            user_id=user_id,
            before=before,
            after=after
        )
    
    @staticmethod
    async def log_customer_created(customer_id: str, user_id: str, customer_data: Dict[str, Any]):
        """Log customer creation"""
        await AuditLogger._log_event(
            table="customers_v2",
            record_id=customer_id,
            action="CREATE",
            user_id=user_id,
            before=None,
            after=customer_data
        )
    
    @staticmethod
    async def log_customer_updated(customer_id: str, user_id: str, before: Dict[str, Any], after: Dict[str, Any]):
        """Log customer update"""
        await AuditLogger._log_event(
            table="customers_v2",
            record_id=customer_id,
            action="UPDATE",
            user_id=user_id,
            before=before,
            after=after
        )
    
    @staticmethod
    async def log_subscription_created(subscription_id: str, user_id: str, subscription_data: Dict[str, Any]):
        """Log subscription creation"""
        await AuditLogger._log_event(
            table="subscriptions_v2",
            record_id=subscription_id,
            action="CREATE",
            user_id=user_id,
            before=None,
            after=subscription_data
        )
    
    @staticmethod
    async def log_payment_created(payment_id: str, user_id: str, payment_data: Dict[str, Any]):
        """Log payment creation"""
        await AuditLogger._log_event(
            table="payment_transactions",
            record_id=payment_id,
            action="CREATE",
            user_id=user_id,
            before=None,
            after=payment_data
        )
    
    @staticmethod
    async def log_payment_updated(payment_id: str, user_id: str, before: Dict[str, Any], after: Dict[str, Any]):
        """Log payment update"""
        await AuditLogger._log_event(
            table="payment_transactions",
            record_id=payment_id,
            action="UPDATE",
            user_id=user_id,
            before=before,
            after=after
        )
    
    @staticmethod
    async def _log_event(
        table: str,
        record_id: str,
        action: str,
        user_id: str,
        before: Optional[Dict[str, Any]],
        after: Optional[Dict[str, Any]]
    ):
        """Internal method to log event to audit_logs collection"""
        try:
            audit_log = {
                "id": str(uuid.uuid4()),
                "table": table,
                "record_id": record_id,
                "action": action,
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "before": before,
                "after": after,
                "changes": AuditLogger._calculate_changes(before, after)
            }
            
            await db.audit_logs.insert_one(audit_log)
        except Exception as e:
            # Log error but don't fail the operation
            print(f"Audit logging failed: {str(e)}")
    
    @staticmethod
    def _calculate_changes(before: Optional[Dict], after: Optional[Dict]) -> Dict[str, Any]:
        """Calculate what fields changed between before and after"""
        if before is None or after is None:
            return {}
        
        changes = {}
        
        # Find fields that changed
        all_keys = set(before.keys()) | set(after.keys())
        
        for key in all_keys:
            before_val = before.get(key)
            after_val = after.get(key)
            
            if before_val != after_val:
                changes[key] = {
                    "old": before_val,
                    "new": after_val
                }
        
        return changes


class AuditQuery:
    """Query audit logs for reporting and debugging"""
    
    @staticmethod
    async def get_record_history(table: str, record_id: str):
        """Get all audit entries for a specific record"""
        logs = await db.audit_logs.find({
            "table": table,
            "record_id": record_id
        }, {"_id": 0}).sort("timestamp", 1).to_list(1000)
        
        return logs
    
    @staticmethod
    async def get_user_actions(user_id: str, limit: int = 100):
        """Get all actions performed by a user"""
        logs = await db.audit_logs.find({
            "user_id": user_id
        }, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return logs
    
    @staticmethod
    async def get_table_history(table: str, limit: int = 100):
        """Get recent changes to a table"""
        logs = await db.audit_logs.find({
            "table": table
        }, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return logs
    
    @staticmethod
    async def get_action_history(table: str, action: str, limit: int = 100):
        """Get all records of a specific action"""
        logs = await db.audit_logs.find({
            "table": table,
            "action": action
        }, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return logs
    
    @staticmethod
    async def get_date_range_logs(start_date: str, end_date: str, table: Optional[str] = None):
        """Get all logs in a date range"""
        query = {
            "timestamp": {
                "$gte": start_date,
                "$lte": end_date
            }
        }
        
        if table:
            query["table"] = table
        
        logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", 1).to_list(10000)
        
        return logs
    
    @staticmethod
    async def generate_audit_report(table: str) -> Dict[str, Any]:
        """Generate audit report for a table"""
        logs = await db.audit_logs.find({"table": table}, {"_id": 0}).to_list(10000)
        
        # Calculate statistics
        actions = {}
        users = {}
        records = {}
        
        for log in logs:
            # Count by action
            action = log.get("action")
            actions[action] = actions.get(action, 0) + 1
            
            # Count by user
            user_id = log.get("user_id")
            users[user_id] = users.get(user_id, 0) + 1
            
            # Count by record
            record_id = log.get("record_id")
            records[record_id] = records.get(record_id, 0) + 1
        
        return {
            "table": table,
            "total_logs": len(logs),
            "actions": actions,
            "users": users,
            "records_affected": len(records),
            "date_range": {
                "first": logs[0]["timestamp"] if logs else None,
                "last": logs[-1]["timestamp"] if logs else None
            }
        }

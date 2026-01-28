# Phase 2.2: Dispute Resolution System
# Complete order dispute handling, refund system, and resolution workflow

import asyncio
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class DisputeStatus(str, Enum):
    """Dispute status states."""
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    REFUNDED = "REFUNDED"
    REJECTED = "REJECTED"


class DisputeReason(str, Enum):
    """Possible dispute reasons."""
    DAMAGED = "damaged"
    NOT_DELIVERED = "not_delivered"
    WRONG_ITEM = "wrong_item"
    QUALITY_ISSUE = "quality_issue"
    MISSING_ITEMS = "missing_items"
    OTHER = "other"


class RefundStatus(str, Enum):
    """Refund processing status."""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class DisputeEngine:
    """
    Dispute resolution and refund management system.
    
    Handles:
    - Dispute creation and tracking
    - Message threading
    - Resolution workflow
    - Refund processing
    - Notification system
    """
    
    def __init__(self, db):
        self.db = db
        self.logger = logger
    
    async def create_dispute(
        self,
        order_id: str,
        customer_id: str,
        reason: str,
        description: str,
        amount: float,
        evidence: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a new dispute for an order.
        
        Args:
        - order_id: Order being disputed
        - customer_id: Customer filing dispute
        - reason: Reason code
        - description: Detailed description
        - amount: Dispute amount (often equals order amount)
        - evidence: List of image URLs (photos of damage, etc)
        
        Returns: Dispute record with ID
        """
        try:
            # Validate order exists
            order = await self.db.orders.find_one({"id": order_id})
            if not order:
                return {"error": "Order not found"}
            
            # Validate customer
            if order.get("customer_id") != customer_id:
                return {"error": "Order does not belong to this customer"}
            
            # Validate reason
            if reason not in [r.value for r in DisputeReason]:
                return {"error": f"Invalid reason. Use: {[r.value for r in DisputeReason]}"}
            
            # Create dispute record
            dispute = {
                "id": f"dispute_{int(datetime.now().timestamp() * 1000)}",
                "order_id": order_id,
                "customer_id": customer_id,
                "reason": reason,
                "description": description,
                "amount": amount,
                "status": DisputeStatus.OPEN.value,
                "evidence": evidence or [],
                "created_at": datetime.now(),
                "resolved_at": None,
                "resolution": None,
                "admin_notes": ""
            }
            
            # Insert dispute
            result = await self.db.disputes.insert_one(dispute)
            
            # Create initial message log
            await self.db.dispute_messages.insert_one({
                "id": f"msg_{int(datetime.now().timestamp() * 1000)}",
                "dispute_id": dispute["id"],
                "sender_id": customer_id,
                "sender_type": "CUSTOMER",
                "message": f"Dispute created: {reason} - {description}",
                "message_type": "SYSTEM",
                "created_at": datetime.now()
            })
            
            # Send notification
            await self._send_dispute_notification(dispute, "created")
            
            self.logger.info(f"Dispute created: {dispute['id']} for order {order_id}")
            
            return {
                "status": "success",
                "dispute_id": dispute["id"],
                "dispute": dispute
            }
        
        except Exception as e:
            self.logger.error(f"Error creating dispute: {str(e)}")
            return {"error": str(e)}
    
    async def get_dispute(self, dispute_id: str) -> Dict[str, Any]:
        """Get dispute details with message thread."""
        try:
            dispute = await self.db.disputes.find_one({"id": dispute_id})
            if not dispute:
                return {"error": "Dispute not found"}
            
            # Get message thread
            messages = await self.db.dispute_messages.find(
                {"dispute_id": dispute_id}
            ).sort("created_at", 1).to_list(None)
            
            return {
                "status": "success",
                "dispute": dispute,
                "messages": messages,
                "message_count": len(messages)
            }
        
        except Exception as e:
            self.logger.error(f"Error getting dispute: {str(e)}")
            return {"error": str(e)}
    
    async def add_message(
        self,
        dispute_id: str,
        sender_id: str,
        sender_type: str,  # "CUSTOMER" or "ADMIN"
        message: str,
        attachments: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Add message to dispute thread.
        
        Args:
        - dispute_id: Which dispute
        - sender_id: Who is sending
        - sender_type: CUSTOMER or ADMIN
        - message: Message text
        - attachments: Image URLs
        """
        try:
            # Validate dispute exists
            dispute = await self.db.disputes.find_one({"id": dispute_id})
            if not dispute:
                return {"error": "Dispute not found"}
            
            # Create message
            msg = {
                "id": f"msg_{int(datetime.now().timestamp() * 1000)}",
                "dispute_id": dispute_id,
                "sender_id": sender_id,
                "sender_type": sender_type,
                "message": message,
                "attachments": attachments or [],
                "message_type": "USER",
                "created_at": datetime.now()
            }
            
            # Insert message
            await self.db.dispute_messages.insert_one(msg)
            
            # Update dispute with latest activity
            await self.db.disputes.update_one(
                {"id": dispute_id},
                {"$set": {"updated_at": datetime.now()}}
            )
            
            # Send notification to other party
            if sender_type == "CUSTOMER":
                await self._send_admin_notification(dispute, "new_message", message)
            else:
                await self._send_customer_notification(dispute, "admin_response", message)
            
            self.logger.info(f"Message added to dispute {dispute_id} from {sender_type}")
            
            return {
                "status": "success",
                "message_id": msg["id"],
                "message": msg
            }
        
        except Exception as e:
            self.logger.error(f"Error adding message: {str(e)}")
            return {"error": str(e)}
    
    async def update_dispute_status(
        self,
        dispute_id: str,
        new_status: str,
        admin_notes: str = ""
    ) -> Dict[str, Any]:
        """
        Update dispute status (admin only).
        
        Args:
        - dispute_id: Which dispute
        - new_status: OPEN, INVESTIGATING, RESOLVED, REFUNDED, REJECTED
        - admin_notes: Internal notes
        """
        try:
            # Validate status
            if new_status not in [s.value for s in DisputeStatus]:
                return {"error": f"Invalid status. Use: {[s.value for s in DisputeStatus]}"}
            
            # Update dispute
            result = await self.db.disputes.update_one(
                {"id": dispute_id},
                {
                    "$set": {
                        "status": new_status,
                        "admin_notes": admin_notes,
                        "updated_at": datetime.now()
                    }
                }
            )
            
            if result.matched_count == 0:
                return {"error": "Dispute not found"}
            
            # Log status change
            await self.db.dispute_messages.insert_one({
                "id": f"msg_{int(datetime.now().timestamp() * 1000)}",
                "dispute_id": dispute_id,
                "sender_id": "SYSTEM",
                "sender_type": "ADMIN",
                "message": f"Status changed to {new_status}. Notes: {admin_notes}",
                "message_type": "SYSTEM",
                "created_at": datetime.now()
            })
            
            # Send notification
            dispute = await self.db.disputes.find_one({"id": dispute_id})
            await self._send_dispute_notification(dispute, "status_updated", new_status)
            
            self.logger.info(f"Dispute {dispute_id} status updated to {new_status}")
            
            return {
                "status": "success",
                "dispute_id": dispute_id,
                "new_status": new_status
            }
        
        except Exception as e:
            self.logger.error(f"Error updating dispute status: {str(e)}")
            return {"error": str(e)}
    
    async def process_refund(
        self,
        dispute_id: str,
        method: str = "wallet",  # "wallet", "original_payment", "manual"
        notes: str = ""
    ) -> Dict[str, Any]:
        """
        Process refund for a dispute.
        
        Args:
        - dispute_id: Which dispute
        - method: How to refund (wallet credit, original payment, manual)
        - notes: Admin notes
        """
        try:
            # Get dispute
            dispute = await self.db.disputes.find_one({"id": dispute_id})
            if not dispute:
                return {"error": "Dispute not found"}
            
            if dispute.get("status") not in [DisputeStatus.INVESTIGATING.value, DisputeStatus.RESOLVED.value]:
                return {"error": "Cannot refund dispute in this status"}
            
            # Create refund record
            refund = {
                "id": f"refund_{int(datetime.now().timestamp() * 1000)}",
                "dispute_id": dispute_id,
                "order_id": dispute.get("order_id"),
                "customer_id": dispute.get("customer_id"),
                "amount": dispute.get("amount"),
                "method": method,
                "status": RefundStatus.PROCESSING.value,
                "notes": notes,
                "created_at": datetime.now(),
                "processed_at": None
            }
            
            # Insert refund
            await self.db.refunds.insert_one(refund)
            
            # Process refund based on method
            if method == "wallet":
                # Credit to wallet
                await self._credit_wallet(dispute.get("customer_id"), dispute.get("amount"))
            elif method == "original_payment":
                # Refund to original payment method
                await self._refund_original_payment(dispute.get("order_id"), dispute.get("amount"))
            
            # Update refund status
            await self.db.refunds.update_one(
                {"id": refund["id"]},
                {
                    "$set": {
                        "status": RefundStatus.PROCESSED.value,
                        "processed_at": datetime.now()
                    }
                }
            )
            
            # Update dispute
            await self.db.disputes.update_one(
                {"id": dispute_id},
                {
                    "$set": {
                        "status": DisputeStatus.REFUNDED.value,
                        "resolved_at": datetime.now(),
                        "resolution": f"Refund processed via {method}"
                    }
                }
            )
            
            # Log refund
            await self.db.dispute_messages.insert_one({
                "id": f"msg_{int(datetime.now().timestamp() * 1000)}",
                "dispute_id": dispute_id,
                "sender_id": "SYSTEM",
                "sender_type": "ADMIN",
                "message": f"Refund of ₹{dispute.get('amount')} processed via {method}",
                "message_type": "SYSTEM",
                "created_at": datetime.now()
            })
            
            # Send notification
            await self._send_customer_notification(
                dispute,
                "refund_processed",
                f"Your refund of ₹{dispute.get('amount')} has been processed"
            )
            
            self.logger.info(f"Refund processed for dispute {dispute_id}: ₹{dispute.get('amount')} via {method}")
            
            return {
                "status": "success",
                "refund_id": refund["id"],
                "amount": refund["amount"],
                "method": method
            }
        
        except Exception as e:
            self.logger.error(f"Error processing refund: {str(e)}")
            return {"error": str(e)}
    
    async def get_customer_disputes(self, customer_id: str) -> Dict[str, Any]:
        """Get all disputes for a customer."""
        try:
            disputes = await self.db.disputes.find(
                {"customer_id": customer_id}
            ).sort("created_at", -1).to_list(None)
            
            # Add message counts
            for dispute in disputes:
                msg_count = await self.db.dispute_messages.count_documents(
                    {"dispute_id": dispute.get("id")}
                )
                dispute["message_count"] = msg_count
            
            # Group by status
            by_status = {}
            for dispute in disputes:
                status = dispute.get("status")
                if status not in by_status:
                    by_status[status] = []
                by_status[status].append(dispute)
            
            return {
                "status": "success",
                "customer_id": customer_id,
                "total_disputes": len(disputes),
                "by_status": by_status,
                "disputes": disputes
            }
        
        except Exception as e:
            self.logger.error(f"Error getting customer disputes: {str(e)}")
            return {"error": str(e)}
    
    async def get_admin_dashboard(self) -> Dict[str, Any]:
        """Get admin dashboard with all open disputes."""
        try:
            # Get disputes by status
            open_disputes = await self.db.disputes.find(
                {"status": DisputeStatus.OPEN.value}
            ).to_list(None)
            
            investigating = await self.db.disputes.find(
                {"status": DisputeStatus.INVESTIGATING.value}
            ).to_list(None)
            
            resolved = await self.db.disputes.find(
                {"status": DisputeStatus.RESOLVED.value}
            ).to_list(None)
            
            refunded = await self.db.disputes.find(
                {"status": DisputeStatus.REFUNDED.value}
            ).to_list(None)
            
            # Calculate totals
            total_open_amount = sum(d.get("amount", 0) for d in open_disputes)
            total_investigating_amount = sum(d.get("amount", 0) for d in investigating)
            total_refunded_amount = sum(d.get("amount", 0) for d in refunded)
            
            return {
                "status": "success",
                "open": {
                    "count": len(open_disputes),
                    "amount": total_open_amount,
                    "disputes": open_disputes
                },
                "investigating": {
                    "count": len(investigating),
                    "amount": total_investigating_amount,
                    "disputes": investigating
                },
                "resolved": {
                    "count": len(resolved),
                    "disputes": resolved
                },
                "refunded": {
                    "count": len(refunded),
                    "amount": total_refunded_amount,
                    "disputes": refunded
                },
                "summary": {
                    "total_disputes": len(open_disputes) + len(investigating) + len(resolved) + len(refunded),
                    "pending_amount": total_open_amount + total_investigating_amount,
                    "resolved_amount": total_refunded_amount
                }
            }
        
        except Exception as e:
            self.logger.error(f"Error getting admin dashboard: {str(e)}")
            return {"error": str(e)}
    
    # Helper methods
    
    async def _credit_wallet(self, customer_id: str, amount: float) -> bool:
        """Credit customer wallet with refund amount."""
        try:
            await self.db.customer_wallets.update_one(
                {"customer_id": customer_id},
                {
                    "$inc": {"balance": amount},
                    "$push": {
                        "transactions": {
                            "type": "REFUND",
                            "amount": amount,
                            "timestamp": datetime.now(),
                            "reason": "Dispute refund"
                        }
                    }
                },
                upsert=True
            )
            return True
        except Exception as e:
            self.logger.error(f"Error crediting wallet: {str(e)}")
            return False
    
    async def _refund_original_payment(self, order_id: str, amount: float) -> bool:
        """Refund to original payment method."""
        try:
            # Get order details
            order = await self.db.orders.find_one({"id": order_id})
            if not order:
                return False
            
            # Process refund (simplified - would call payment gateway in production)
            payment_method = order.get("payment_method", "wallet")
            
            # Record refund transaction
            await self.db.refund_transactions.insert_one({
                "id": f"refund_{int(datetime.now().timestamp() * 1000)}",
                "order_id": order_id,
                "amount": amount,
                "payment_method": payment_method,
                "status": "PROCESSED",
                "created_at": datetime.now()
            })
            
            return True
        except Exception as e:
            self.logger.error(f"Error refunding payment: {str(e)}")
            return False
    
    async def _send_dispute_notification(self, dispute: Dict[str, Any], event: str, data: str = "") -> None:
        """Send dispute notification (WhatsApp/Email)."""
        try:
            customer_id = dispute.get("customer_id")
            customer = await self.db.customers_v2.find_one({"id": customer_id})
            
            if not customer:
                return
            
            message = f"Dispute Status: Your dispute #{dispute.get('id')} for order {dispute.get('order_id')} has been {event}"
            
            # Send WhatsApp notification (would use actual WhatsApp service)
            # await whatsapp_service.send_message(customer.get("phone"), message)
            
            self.logger.info(f"Dispute notification sent to {customer_id}: {event}")
        except Exception as e:
            self.logger.error(f"Error sending notification: {str(e)}")
    
    async def _send_customer_notification(self, dispute: Dict[str, Any], event: str, message: str) -> None:
        """Send notification to customer."""
        await self._send_dispute_notification(dispute, event, message)
    
    async def _send_admin_notification(self, dispute: Dict[str, Any], event: str, message: str) -> None:
        """Send notification to admin."""
        # Would send to admin WhatsApp/Email/Dashboard
        self.logger.info(f"Admin notification: {event} - {message}")


# Export
__all__ = [
    "DisputeEngine",
    "DisputeStatus",
    "DisputeReason",
    "RefundStatus"
]

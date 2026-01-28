"""
WhatsApp Notification Service (MyOperator Integration)
Handles all WhatsApp communication via MyOperator Business API
- Message templates and rendering
- Async queue management
- Retry logic for failed messages
- Message history and logging
"""

import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from jinja2 import Template
import asyncio
import logging
from enum import Enum
import httpx
import json

from dotenv import load_dotenv
from database import db

# Load environment
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# MyOperator API credentials from environment
MYOPERATOR_API_KEY = os.getenv("MYOPERATOR_API_KEY")
MYOPERATOR_API_SECRET = os.getenv("MYOPERATOR_API_SECRET")
MYOPERATOR_ACCOUNT_ID = os.getenv("MYOPERATOR_ACCOUNT_ID")
MYOPERATOR_WHATSAPP_NUMBER = os.getenv("MYOPERATOR_WHATSAPP_NUMBER")  # WhatsApp Business number

# MyOperator API endpoints
MYOPERATOR_BASE_URL = "https://api.myoperator.co"
MYOPERATOR_SEND_MESSAGE_URL = f"{MYOPERATOR_BASE_URL}/whatsapp/send-message"
MYOPERATOR_MESSAGE_STATUS_URL = f"{MYOPERATOR_BASE_URL}/whatsapp/message-status"


class MessageStatus(str, Enum):
    """Message status enum"""
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"


class MessageType(str, Enum):
    """Message type enum"""
    DELIVERY_REMINDER = "delivery_reminder"
    DELIVERY_CONFIRMED = "delivery_confirmed"
    PAYMENT_REMINDER = "payment_reminder"
    PAYMENT_CONFIRMATION = "payment_confirmation"
    PAUSE_CONFIRMATION = "pause_confirmation"
    PAUSE_REMINDER = "pause_reminder"
    SUBSCRIPTION_CONFIRMATION = "subscription_confirmation"
    ORDER_CONFIRMATION = "order_confirmation"
    CHURN_RISK = "churn_risk"
    NEW_PRODUCT = "new_product"
    SYSTEM_ALERT = "system_alert"


class WhatsAppNotificationService:
    """
    WhatsApp notification service with MyOperator integration
    Handles message queuing, retry logic, and delivery tracking
    """

    def __init__(self):
        self.api_key = MYOPERATOR_API_KEY
        self.api_secret = MYOPERATOR_API_SECRET
        self.account_id = MYOPERATOR_ACCOUNT_ID
        self.from_number = MYOPERATOR_WHATSAPP_NUMBER
        self.max_retries = 3
        self.retry_delay = 300  # 5 minutes
        self.http_client = None

    async def _get_http_client(self):
        """Get or create HTTP client"""
        if self.http_client is None:
            self.http_client = httpx.AsyncClient(timeout=30.0)
        return self.http_client

    async def _send_via_myoperator(
        self,
        phone: str,
        message_text: str,
        message_id: str
    ) -> Dict:
        """
        Send message via MyOperator WhatsApp API
        
        Args:
            phone: Recipient phone number (format: +919876543210)
            message_text: Message content
            message_id: Internal message tracking ID
        
        Returns:
            {
                "success": bool,
                "myoperator_id": str,  # MyOperator message ID
                "status": "sent" or "failed",
                "error": str (if failed)
            }
        """
        try:
            client = await self._get_http_client()
            
            # MyOperator API payload
            payload = {
                "api_key": self.api_key,
                "api_secret": self.api_secret,
                "account_id": self.account_id,
                "recipient": phone,  # International format
                "message": message_text,
                "message_id": message_id,  # For tracking
                "type": "text"  # Can be: text, image, document, location, contact
            }
            
            logger.info(f"Sending WhatsApp message to {phone} via MyOperator")
            
            response = await client.post(
                MYOPERATOR_SEND_MESSAGE_URL,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                return {
                    "success": True,
                    "myoperator_id": result.get("message_id") or result.get("id"),
                    "status": "sent",
                    "error": None
                }
            else:
                error_msg = f"MyOperator API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "myoperator_id": None,
                    "status": "failed",
                    "error": error_msg
                }
                
        except Exception as e:
            error_msg = f"Exception sending WhatsApp message: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "myoperator_id": None,
                "status": "failed",
                "error": error_msg
            }

    async def send_message(
        self,
        phone: str,
        message_type: MessageType,
        context: Dict = None,
        reference_id: str = None,
        immediate: bool = False
    ) -> Dict:
        """
        Send WhatsApp message
        
        Args:
            phone: Recipient phone number (format: +919876543210)
            message_type: Type of message to send
            context: Dictionary with template variables
            reference_id: Related object ID (order_id, subscription_id, etc)
            immediate: If True, send immediately; if False, queue for later
        
        Returns:
            {
                "id": message_id,
                "status": "queued" or "sent",
                "phone": phone,
                "type": message_type,
                "timestamp": sent_at,
                "myoperator_id": str (if sent immediately)
            }
        """
        try:
            if context is None:
                context = {}
            
            # Generate message ID
            message_id = str(uuid.uuid4())
            
            # Fetch template and render
            from notification_templates import get_template_by_type
            template_obj = await get_template_by_type(message_type)
            
            if not template_obj:
                raise ValueError(f"Template not found: {message_type}")
            
            template = Template(template_obj.get("content", ""))
            message_text = template.render(**context)
            
            now = datetime.now(timezone.utc)
            
            # Create log entry
            log_entry = {
                "id": message_id,
                "phone": phone,
                "type": message_type,
                "message": message_text,
                "status": MessageStatus.QUEUED,
                "reference_id": reference_id,
                "context": context,
                "created_at": now.isoformat(),
                "sent_at": None,
                "delivered_at": None,
                "failed_at": None,
                "error_message": None,
                "retry_count": 0,
                "max_retries": self.max_retries,
                "myoperator_message_id": None,
                "next_retry_at": None
            }
            
            if immediate:
                # Send immediately
                result = await self._send_via_myoperator(phone, message_text, message_id)
                
                if result["success"]:
                    log_entry["status"] = MessageStatus.SENT
                    log_entry["sent_at"] = datetime.now(timezone.utc).isoformat()
                    log_entry["myoperator_message_id"] = result["myoperator_id"]
                    logger.info(f"Message {message_id} sent successfully to {phone}")
                else:
                    log_entry["status"] = MessageStatus.FAILED
                    log_entry["failed_at"] = datetime.now(timezone.utc).isoformat()
                    log_entry["error_message"] = result["error"]
                    # Schedule for retry
                    log_entry["next_retry_at"] = (now + timedelta(minutes=5)).isoformat()
                    logger.warning(f"Message {message_id} failed: {result['error']}")
            else:
                # Queue for later processing
                log_entry["next_retry_at"] = (now + timedelta(minutes=1)).isoformat()
                logger.info(f"Message {message_id} queued for {phone}")
            
            # Save to database
            await db.notifications_log.insert_one(log_entry)
            
            # Also save to queue if not sent immediately
            if not immediate or (immediate and not result["success"]):
                await db.notifications_queue.insert_one({
                    "message_id": message_id,
                    "phone": phone,
                    "type": message_type,
                    "message": message_text,
                    "retry_count": 0,
                    "max_retries": self.max_retries,
                    "created_at": now.isoformat(),
                    "retry_at": log_entry.get("next_retry_at"),
                    "context": context,
                    "reference_id": reference_id
                })
            
            return {
                "id": message_id,
                "status": log_entry["status"],
                "phone": phone,
                "type": message_type,
                "timestamp": now.isoformat(),
                "myoperator_id": result.get("myoperator_id") if immediate else None
            }
            
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            raise

    async def process_queue(self) -> Dict:
        """
        Process queued messages and retry failed ones
        Should be called every 5 minutes via background task
        
        Returns:
            {
                "processed": int,
                "successful": int,
                "failed": int,
                "timestamp": str
            }
        """
        try:
            now = datetime.now(timezone.utc)
            
            # Find messages due for retry
            retry_messages = await db.notifications_queue.find({
                "retry_at": {"$lte": now.isoformat()},
                "retry_count": {"$lt": "$max_retries"}
            }).to_list(100)
            
            processed = 0
            successful = 0
            failed_count = 0
            
            for msg in retry_messages:
                processed += 1
                
                # Send via MyOperator
                result = await self._send_via_myoperator(
                    msg["phone"],
                    msg["message"],
                    msg["message_id"]
                )
                
                # Update retry count
                retry_count = msg.get("retry_count", 0) + 1
                
                if result["success"]:
                    successful += 1
                    
                    # Update log entry to SENT
                    await db.notifications_log.update_one(
                        {"id": msg["message_id"]},
                        {
                            "$set": {
                                "status": MessageStatus.SENT,
                                "sent_at": now.isoformat(),
                                "myoperator_message_id": result["myoperator_id"],
                                "retry_count": retry_count
                            }
                        }
                    )
                    
                    # Remove from queue
                    await db.notifications_queue.delete_one({"message_id": msg["message_id"]})
                    
                    logger.info(f"Retry successful for message {msg['message_id']}")
                    
                else:
                    failed_count += 1
                    
                    if retry_count >= msg.get("max_retries", 3):
                        # Max retries exceeded, mark as failed
                        await db.notifications_log.update_one(
                            {"id": msg["message_id"]},
                            {
                                "$set": {
                                    "status": MessageStatus.FAILED,
                                    "failed_at": now.isoformat(),
                                    "error_message": result["error"],
                                    "retry_count": retry_count
                                }
                            }
                        )
                        
                        # Remove from queue
                        await db.notifications_queue.delete_one({"message_id": msg["message_id"]})
                        
                        logger.error(f"Message {msg['message_id']} failed after {retry_count} retries")
                    else:
                        # Schedule next retry
                        next_retry = now + timedelta(minutes=5 * retry_count)  # Exponential backoff
                        
                        await db.notifications_queue.update_one(
                            {"message_id": msg["message_id"]},
                            {
                                "$set": {
                                    "retry_count": retry_count,
                                    "retry_at": next_retry.isoformat()
                                }
                            }
                        )
                        
                        # Update log with retry info
                        await db.notifications_log.update_one(
                            {"id": msg["message_id"]},
                            {
                                "$set": {
                                    "retry_count": retry_count,
                                    "next_retry_at": next_retry.isoformat(),
                                    "error_message": result["error"]
                                }
                            }
                        )
                        
                        logger.warning(f"Retry {retry_count} failed for {msg['message_id']}, scheduled next retry")
            
            return {
                "processed": processed,
                "successful": successful,
                "failed": failed_count,
                "timestamp": now.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing queue: {str(e)}")
            return {
                "processed": 0,
                "successful": 0,
                "failed": 0,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    async def get_message_history(
        self,
        phone: str = None,
        reference_id: str = None,
        status: str = None,
        limit: int = 50,
        skip: int = 0,
        days: int = 30
    ) -> List[Dict]:
        """
        Get message history with optional filters
        
        Args:
            phone: Filter by phone number
            reference_id: Filter by reference ID
            status: Filter by status (sent, delivered, failed, etc)
            limit: Number of messages to return
            skip: Pagination offset
            days: Look back N days
        
        Returns:
            List of message records
        """
        try:
            query = {}
            
            # Date filter
            start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            query["created_at"] = {"$gte": start_date}
            
            if phone:
                query["phone"] = phone
            if reference_id:
                query["reference_id"] = reference_id
            if status:
                query["status"] = status
            
            messages = await db.notifications_log.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
            
            return messages or []
            
        except Exception as e:
            logger.error(f"Error fetching message history: {str(e)}")
            return []

    async def get_message_by_id(self, message_id: str) -> Dict:
        """Get specific message by ID"""
        try:
            message = await db.notifications_log.find_one({"id": message_id})
            return message
        except Exception as e:
            logger.error(f"Error fetching message {message_id}: {str(e)}")
            return None

    async def resend_message(self, message_id: str) -> Dict:
        """
        Manually resend a message
        
        Args:
            message_id: ID of message to resend
        
        Returns:
            {
                "success": bool,
                "status": str,
                "error": str (if failed)
            }
        """
        try:
            # Get original message
            message = await self.get_message_by_id(message_id)
            
            if not message:
                return {
                    "success": False,
                    "status": "error",
                    "error": "Message not found"
                }
            
            # Send via MyOperator
            result = await self._send_via_myoperator(
                message["phone"],
                message["message"],
                message_id
            )
            
            now = datetime.now(timezone.utc)
            
            if result["success"]:
                # Update log
                await db.notifications_log.update_one(
                    {"id": message_id},
                    {
                        "$set": {
                            "status": MessageStatus.SENT,
                            "sent_at": now.isoformat(),
                            "myoperator_message_id": result["myoperator_id"]
                        }
                    }
                )
                
                # Remove from queue if exists
                await db.notifications_queue.delete_one({"message_id": message_id})
                
                return {
                    "success": True,
                    "status": "sent",
                    "myoperator_id": result["myoperator_id"]
                }
            else:
                return {
                    "success": False,
                    "status": "failed",
                    "error": result["error"]
                }
                
        except Exception as e:
            logger.error(f"Error resending message {message_id}: {str(e)}")
            return {
                "success": False,
                "status": "error",
                "error": str(e)
            }

    async def get_statistics(self, days: int = 30) -> Dict:
        """
        Get message statistics for last N days
        
        Returns:
            {
                "total_sent": int,
                "total_delivered": int,
                "total_failed": int,
                "total_read": int,
                "success_rate": float (percentage),
                "delivery_rate": float (percentage),
                "period_days": int
            }
        """
        try:
            start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            
            query = {"created_at": {"$gte": start_date}}
            
            total_sent = await db.notifications_log.count_documents({
                **query,
                "status": {"$in": [MessageStatus.SENT, MessageStatus.DELIVERED, MessageStatus.READ]}
            })
            
            total_delivered = await db.notifications_log.count_documents({
                **query,
                "status": {"$in": [MessageStatus.DELIVERED, MessageStatus.READ]}
            })
            
            total_failed = await db.notifications_log.count_documents({
                **query,
                "status": MessageStatus.FAILED
            })
            
            total_read = await db.notifications_log.count_documents({
                **query,
                "status": MessageStatus.READ
            })
            
            total = total_sent + total_failed
            
            return {
                "total_sent": total_sent,
                "total_delivered": total_delivered,
                "total_failed": total_failed,
                "total_read": total_read,
                "success_rate": round((total_sent / total * 100) if total > 0 else 0, 2),
                "delivery_rate": round((total_delivered / total_sent * 100) if total_sent > 0 else 0, 2),
                "period_days": days
            }
            
        except Exception as e:
            logger.error(f"Error calculating statistics: {str(e)}")
            return {
                "error": str(e),
                "total_sent": 0,
                "total_delivered": 0,
                "total_failed": 0,
                "total_read": 0,
                "success_rate": 0,
                "delivery_rate": 0,
                "period_days": days
            }

    async def close(self):
        """Close HTTP client"""
        if self.http_client:
            await self.http_client.aclose()


# Create singleton instance
notification_service = WhatsAppNotificationService()


# Helper functions for easy access

async def send_delivery_reminder(
    phone: str,
    customer_name: str,
    delivery_date: str,
    area: str,
    subscription_id: str = None
) -> Dict:
    """
    Send delivery reminder message
    
    Example: "Hi John! Your milk delivery from EarlyBird is scheduled for Jan 28, 6-8 AM in Bandra"
    """
    return await notification_service.send_message(
        phone=phone,
        message_type=MessageType.DELIVERY_REMINDER,
        context={
            "customer_name": customer_name,
            "delivery_date": delivery_date,
            "area": area
        },
        reference_id=subscription_id,
        immediate=True
    )


async def send_delivery_confirmed(
    phone: str,
    customer_name: str,
    delivery_date: str,
    order_id: str = None
) -> Dict:
    """
    Send delivery confirmation message
    
    Example: "✓ Delivery confirmed for Jan 28! Thank you for choosing EarlyBird"
    """
    return await notification_service.send_message(
        phone=phone,
        message_type=MessageType.DELIVERY_CONFIRMED,
        context={
            "customer_name": customer_name,
            "delivery_date": delivery_date
        },
        reference_id=order_id,
        immediate=True
    )


async def send_payment_reminder(
    phone: str,
    customer_name: str,
    amount: float,
    period: str,
    bill_id: str = None
) -> Dict:
    """
    Send payment reminder message
    
    Example: "Hi John! Payment due: ₹2,500 for Jan deliveries. Pay now: https://earlybird.in/pay/xxx"
    """
    return await notification_service.send_message(
        phone=phone,
        message_type=MessageType.PAYMENT_REMINDER,
        context={
            "customer_name": customer_name,
            "amount": f"₹{amount:,.0f}",
            "period": period
        },
        reference_id=bill_id,
        immediate=True
    )


async def send_payment_confirmation(
    phone: str,
    customer_name: str,
    amount: float,
    order_id: str = None
) -> Dict:
    """
    Send payment confirmation message
    
    Example: "✓ Payment received! ₹2,500 credited to your account. Thank you!"
    """
    return await notification_service.send_message(
        phone=phone,
        message_type=MessageType.PAYMENT_CONFIRMATION,
        context={
            "customer_name": customer_name,
            "amount": f"₹{amount:,.0f}"
        },
        reference_id=order_id,
        immediate=True
    )


async def send_subscription_confirmation(
    phone: str,
    customer_name: str,
    product: str,
    start_date: str,
    subscription_id: str = None
) -> Dict:
    """
    Send subscription confirmation message
    
    Example: "✓ Subscription confirmed! Daily milk starting Jan 28. Manage: https://earlybird.in/sub/xxx"
    """
    return await notification_service.send_message(
        phone=phone,
        message_type=MessageType.SUBSCRIPTION_CONFIRMATION,
        context={
            "customer_name": customer_name,
            "product": product,
            "start_date": start_date
        },
        reference_id=subscription_id,
        immediate=True
    )


async def send_order_confirmation(
    phone: str,
    customer_name: str,
    order_id: str,
    total_amount: float,
    delivery_date: str
) -> Dict:
    """
    Send order confirmation message
    
    Example: "✓ Order confirmed! ₹500 for 2L milk. Delivery: Jan 28, 6-8 AM"
    """
    return await notification_service.send_message(
        phone=phone,
        message_type=MessageType.ORDER_CONFIRMATION,
        context={
            "customer_name": customer_name,
            "order_id": order_id,
            "amount": f"₹{total_amount:,.0f}",
            "delivery_date": delivery_date
        },
        reference_id=order_id,
        immediate=True
    )


async def send_pause_confirmation(
    phone: str,
    customer_name: str,
    resume_date: str,
    subscription_id: str = None
) -> Dict:
    """
    Send pause confirmation message
    
    Example: "✓ Subscription paused until Jan 31. Resume anytime: https://earlybird.in"
    """
    return await notification_service.send_message(
        phone=phone,
        message_type=MessageType.PAUSE_CONFIRMATION,
        context={
            "customer_name": customer_name,
            "resume_date": resume_date
        },
        reference_id=subscription_id,
        immediate=True
    )


async def send_churn_risk_message(
    phone: str,
    customer_name: str,
    subscription_id: str = None
) -> Dict:
    """
    Send churn risk/retention message
    
    Example: "We miss you! Paused since Jan 20. Resume for 20% off: https://earlybird.in/resume/xxx"
    """
    return await notification_service.send_message(
        phone=phone,
        message_type=MessageType.CHURN_RISK,
        context={
            "customer_name": customer_name
        },
        reference_id=subscription_id,
        immediate=True
    )

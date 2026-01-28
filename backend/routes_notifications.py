"""
WhatsApp Notification Routes
Endpoints for managing notifications, templates, and history
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone

from models import *
from database import db
from auth import get_current_user, require_role
from notification_service import notification_service, MessageType
from notification_templates import get_all_templates, update_template, get_template_by_type

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ==================== MESSAGE SENDING ====================

@router.post("/send-message")
async def send_message(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Send WhatsApp message
    
    Body: {
        "phone": "+919876543210",
        "message_type": "delivery_reminder",
        "context": {
            "customer_name": "John",
            "delivery_date": "Jan 28"
        },
        "reference_id": "order-123",
        "immediate": true
    }
    """
    try:
        # Only admins and delivery boys can send messages
        if current_user.get("role") not in [UserRole.ADMIN, UserRole.DELIVERY_BOY]:
            raise HTTPException(status_code=403, detail="Not authorized to send messages")

        phone = request.get("phone")
        message_type = request.get("message_type")
        context = request.get("context", {})
        reference_id = request.get("reference_id")
        immediate = request.get("immediate", True)

        if not phone or not message_type:
            raise HTTPException(status_code=400, detail="phone and message_type required")

        # Send message
        result = await notification_service.send_message(
            phone=phone,
            message_type=MessageType(message_type),
            context=context,
            reference_id=reference_id,
            immediate=immediate
        )

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid message type: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MESSAGE HISTORY ====================

@router.get("/history")
async def get_message_history(
    phone: Optional[str] = Query(None),
    reference_id: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    skip: int = Query(0),
    current_user: dict = Depends(get_current_user)
):
    """
    Get message history
    
    Query params:
    - phone: Filter by recipient phone
    - reference_id: Filter by order_id/subscription_id
    - limit: Max results (default 50, max 100)
    - skip: Pagination offset
    """
    try:
        messages = await notification_service.get_message_history(
            phone=phone,
            reference_id=reference_id,
            limit=limit,
            skip=skip
        )

        return {
            "count": len(messages),
            "messages": messages
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{phone}")
async def get_customer_message_history(
    phone: str,
    limit: int = Query(30, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    Get message history for a specific phone number
    """
    try:
        messages = await notification_service.get_message_history(
            phone=phone,
            limit=limit
        )

        # Group by type
        grouped = {}
        for msg in messages:
            msg_type = msg["type"]
            if msg_type not in grouped:
                grouped[msg_type] = []
            grouped[msg_type].append(msg)

        return {
            "phone": phone,
            "total": len(messages),
            "by_type": grouped,
            "messages": messages
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MESSAGE RESEND ====================

@router.post("/resend/{message_id}")
async def resend_message(
    message_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Resend a failed message
    """
    try:
        result = await notification_service.resend_message(message_id)

        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STATISTICS ====================

@router.get("/statistics")
async def get_statistics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get notification statistics for last N days
    """
    try:
        stats = await notification_service.get_statistics(days=days)

        # Calculate additional metrics
        if stats["total_messages"] > 0:
            delivery_rate = (stats["delivered"] / stats["total_messages"]) * 100 if stats["delivered"] > 0 else 0
            success_rate = ((stats["sent"] + stats["delivered"]) / stats["total_messages"]) * 100
        else:
            delivery_rate = 0
            success_rate = 0

        return {
            "period_days": days,
            "statistics": stats,
            "metrics": {
                "delivery_rate_percent": round(delivery_rate, 2),
                "success_rate_percent": round(success_rate, 2),
                "failure_rate_percent": round(100 - success_rate, 2)
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== TEMPLATES ====================

@router.get("/templates")
async def get_templates(
    active_only: bool = Query(True),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all notification templates
    """
    try:
        templates = await get_all_templates(active_only=active_only)

        return {
            "count": len(templates),
            "templates": templates
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/{template_type}")
async def get_template(
    template_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get specific template by type
    """
    try:
        template = await get_template_by_type(template_type)

        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        return template

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/templates/{template_type}")
async def update_notification_template(
    template_type: str,
    request: dict,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Update template content
    
    Body: {
        "content": "New template content with {{variables}}"
    }
    """
    try:
        new_content = request.get("content")
        if not new_content:
            raise HTTPException(status_code=400, detail="content required")

        result = await update_template(template_type, new_content)

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")

        return {
            "message": "Template updated",
            "type": template_type,
            "modified": True
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PROCESS QUEUE ====================

@router.post("/process-queue")
async def process_notification_queue(
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Manually process queued messages for retry
    (Typically runs automatically every 5 minutes)
    """
    try:
        await notification_service.process_queue()

        return {
            "message": "Queue processed",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== HEALTH CHECK ====================

@router.get("/health")
async def notification_health():
    """
    Check notification service health
    """
    try:
        stats = await notification_service.get_statistics(days=1)

        return {
            "status": "healthy",
            "service": "WhatsApp Notifications",
            "today_messages": stats.get("total_messages", 0),
            "today_sent": stats.get("sent", 0),
            "today_failed": stats.get("failed", 0)
        }

    except Exception as e:
        return {
            "status": "error",
            "service": "WhatsApp Notifications",
            "error": str(e)
        }

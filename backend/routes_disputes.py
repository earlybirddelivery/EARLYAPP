# Phase 2.2: Dispute Resolution REST API Routes
# Complete dispute handling endpoints with RBAC

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/disputes", tags=["Disputes"])


# ========== PYDANTIC MODELS ==========

class CreateDisputeRequest(BaseModel):
    """Request model for creating a dispute."""
    order_id: str
    reason: str  # "damaged", "not_delivered", "wrong_item", "quality_issue", "missing_items", "other"
    description: str
    evidence: Optional[List[str]] = None  # Image URLs


class AddMessageRequest(BaseModel):
    """Request model for adding message to dispute."""
    message: str
    attachments: Optional[List[str]] = None


class UpdateStatusRequest(BaseModel):
    """Request model for updating dispute status."""
    status: str  # "OPEN", "INVESTIGATING", "RESOLVED", "REJECTED"
    admin_notes: Optional[str] = None


class ProcessRefundRequest(BaseModel):
    """Request model for processing refund."""
    method: str = "wallet"  # "wallet", "original_payment", "manual"
    notes: Optional[str] = None


# ========== DEPENDENCY INJECTION ==========

def get_dispute_engine(db=Depends()):
    """Get dispute engine."""
    from backend.dispute_engine import DisputeEngine
    return DisputeEngine(db)


# ========== CUSTOMER ENDPOINTS ==========

@router.post("/create")
async def create_dispute(
    request: CreateDisputeRequest,
    current_user=Depends(),  # From auth middleware
    engine=Depends(get_dispute_engine)
):
    """
    Create a new dispute for an order.
    
    Only customers can create disputes for their own orders.
    """
    try:
        # Get customer ID from auth
        customer_id = current_user.get("id")
        
        # Create dispute
        result = await engine.create_dispute(
            order_id=request.order_id,
            customer_id=customer_id,
            reason=request.reason,
            description=request.description,
            amount=await _get_order_amount(request.order_id),  # Get amount from order
            evidence=request.evidence
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "status": "success",
            "message": "Dispute created successfully",
            "dispute_id": result.get("dispute_id")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating dispute: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{dispute_id}")
async def get_dispute(
    dispute_id: str,
    current_user=Depends(),
    engine=Depends(get_dispute_engine)
):
    """
    Get dispute details with message thread.
    
    Customer can view own disputes, admin can view all.
    """
    try:
        result = await engine.get_dispute(dispute_id)
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        # Check authorization
        dispute = result.get("dispute")
        if current_user.get("role") != "admin" and dispute.get("customer_id") != current_user.get("id"):
            raise HTTPException(status_code=403, detail="Not authorized to view this dispute")
        
        return {
            "status": "success",
            "dispute": dispute,
            "messages": result.get("messages"),
            "message_count": result.get("message_count")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dispute: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{dispute_id}/add-message")
async def add_message_to_dispute(
    dispute_id: str,
    request: AddMessageRequest,
    current_user=Depends(),
    engine=Depends(get_dispute_engine)
):
    """
    Add message to dispute thread.
    
    Both customers and admins can add messages.
    """
    try:
        # Determine sender type
        sender_type = "ADMIN" if current_user.get("role") == "admin" else "CUSTOMER"
        
        result = await engine.add_message(
            dispute_id=dispute_id,
            sender_id=current_user.get("id"),
            sender_type=sender_type,
            message=request.message,
            attachments=request.attachments
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "status": "success",
            "message": "Message added successfully",
            "message_id": result.get("message_id")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customer/{customer_id}")
async def get_customer_disputes(
    customer_id: str,
    current_user=Depends(),
    engine=Depends(get_dispute_engine)
):
    """
    Get all disputes for a customer.
    
    Customer can view own disputes, admin can view all.
    """
    try:
        # Authorization check
        if current_user.get("role") != "admin" and customer_id != current_user.get("id"):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        result = await engine.get_customer_disputes(customer_id)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "status": "success",
            "total_disputes": result.get("total_disputes"),
            "by_status": result.get("by_status"),
            "disputes": result.get("disputes")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting customer disputes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== ADMIN ENDPOINTS ==========

@router.put("/{dispute_id}/status")
async def update_dispute_status(
    dispute_id: str,
    request: UpdateStatusRequest,
    current_user=Depends(),
    engine=Depends(get_dispute_engine)
):
    """
    Update dispute status (admin only).
    
    Status: OPEN, INVESTIGATING, RESOLVED, REJECTED
    """
    try:
        # Admin only
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await engine.update_dispute_status(
            dispute_id=dispute_id,
            new_status=request.status,
            admin_notes=request.admin_notes or ""
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "status": "success",
            "message": f"Dispute status updated to {request.status}",
            "dispute_id": dispute_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating dispute status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{dispute_id}/refund")
async def process_dispute_refund(
    dispute_id: str,
    request: ProcessRefundRequest,
    current_user=Depends(),
    engine=Depends(get_dispute_engine)
):
    """
    Process refund for a dispute (admin only).
    
    Method: "wallet" (default), "original_payment", "manual"
    """
    try:
        # Admin only
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await engine.process_refund(
            dispute_id=dispute_id,
            method=request.method,
            notes=request.notes or ""
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "status": "success",
            "message": "Refund processed successfully",
            "refund_id": result.get("refund_id"),
            "amount": result.get("amount"),
            "method": result.get("method")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing refund: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/dashboard")
async def get_admin_dashboard(
    current_user=Depends(),
    engine=Depends(get_dispute_engine)
):
    """
    Get admin dashboard with all disputes.
    
    Shows open, investigating, resolved, and refunded disputes.
    Admin only.
    """
    try:
        # Admin only
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await engine.get_admin_dashboard()
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "status": "success",
            "dashboard": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/stats")
async def get_dispute_statistics(
    current_user=Depends(),
    engine=Depends(get_dispute_engine)
):
    """
    Get dispute statistics and analytics (admin only).
    
    Returns:
    - Total disputes by status
    - Amount involved
    - Trends
    - Most common reasons
    """
    try:
        # Admin only
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get dashboard (contains stats)
        result = await engine.get_admin_dashboard()
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        dashboard = result
        
        # Calculate additional stats
        summary = dashboard.get("summary", {})
        
        return {
            "status": "success",
            "statistics": {
                "total_disputes": summary.get("total_disputes", 0),
                "total_disputed_amount": summary.get("pending_amount", 0) + summary.get("resolved_amount", 0),
                "pending_amount": summary.get("pending_amount", 0),
                "resolved_amount": summary.get("resolved_amount", 0),
                "average_dispute_amount": (summary.get("pending_amount", 0) + summary.get("resolved_amount", 0)) / max(summary.get("total_disputes", 1), 1),
                "open_disputes": dashboard.get("open", {}).get("count", 0),
                "investigating_disputes": dashboard.get("investigating", {}).get("count", 0),
                "resolved_disputes": dashboard.get("resolved", {}).get("count", 0),
                "refunded_disputes": dashboard.get("refunded", {}).get("count", 0),
                "resolution_rate": (dashboard.get("resolved", {}).get("count", 0) + dashboard.get("refunded", {}).get("count", 0)) / max(summary.get("total_disputes", 1), 1)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== HELPER FUNCTIONS ==========

async def _get_order_amount(order_id: str, db=Depends()) -> float:
    """Get order amount from order ID."""
    try:
        order = await db.orders.find_one({"id": order_id})
        return order.get("total_amount", 0) if order else 0
    except:
        return 0


# Export
__all__ = ["router"]

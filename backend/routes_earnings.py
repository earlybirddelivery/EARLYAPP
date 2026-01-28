"""
routes_earnings.py - Staff Earnings API Endpoints
REST API for earnings calculation, statements, and payouts
"""

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime, date
import json

from earnings_service import EarningsService
from auth import verify_token
from database import db

router = APIRouter(prefix="/api/earnings", tags=["earnings"])


@router.get("/health")
async def health_check():
    """Health check endpoint for earnings service"""
    return JSONResponse(
        status_code=200,
        content={"status": "OK", "service": "earnings"}
    )


@router.get("/my-daily/{date_str}")
async def get_daily_earnings(
    date_str: str,
    authorization: str = Header(None)
):
    """
    Get personal daily earnings (delivery boy only)
    
    Args:
        date_str: Date in YYYY-MM-DD format
    
    Returns:
        Daily earnings breakdown with bonuses and deductions
    """
    try:
        # Verify auth
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Check if delivery boy
        delivery_boy_id = user.get("delivery_boy_id")
        if not delivery_boy_id:
            raise HTTPException(
                status_code=403,
                detail="Only delivery boys can access earnings"
            )
        
        # Validate date format
        datetime.strptime(date_str, "%Y-%m-%d")
        
        # Get earnings
        earnings = await EarningsService.calculate_daily_earnings(
            delivery_boy_id,
            date_str
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": earnings
            }
        )
    
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content={"detail": f"Invalid date format: {str(e)}"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to get daily earnings: {str(e)}"}
        )


@router.get("/my-weekly/{week_start_date}")
async def get_weekly_earnings(
    week_start_date: str,
    authorization: str = Header(None)
):
    """
    Get personal weekly earnings (delivery boy only)
    
    Args:
        week_start_date: Monday of the week in YYYY-MM-DD format
    
    Returns:
        Weekly earnings breakdown with daily breakdown
    """
    try:
        # Verify auth
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Check if delivery boy
        delivery_boy_id = user.get("delivery_boy_id")
        if not delivery_boy_id:
            raise HTTPException(
                status_code=403,
                detail="Only delivery boys can access earnings"
            )
        
        # Validate date format
        start_date = datetime.strptime(week_start_date, "%Y-%m-%d").date()
        
        # Verify it's a Monday
        if start_date.weekday() != 0:  # 0 = Monday
            raise ValueError("week_start_date must be a Monday")
        
        # Get earnings
        earnings = await EarningsService.calculate_weekly_earnings(
            delivery_boy_id,
            week_start_date
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": earnings
            }
        )
    
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content={"detail": f"Invalid date format or range: {str(e)}"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to get weekly earnings: {str(e)}"}
        )


@router.get("/my-monthly/{year}/{month}")
async def get_monthly_earnings(
    year: int,
    month: int,
    authorization: str = Header(None)
):
    """
    Get personal monthly earnings (delivery boy only)
    
    Args:
        year: Year (e.g., 2024)
        month: Month (1-12)
    
    Returns:
        Monthly earnings with weekly breakdown
    """
    try:
        # Verify auth
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Check if delivery boy
        delivery_boy_id = user.get("delivery_boy_id")
        if not delivery_boy_id:
            raise HTTPException(
                status_code=403,
                detail="Only delivery boys can access earnings"
            )
        
        # Validate month
        if not (1 <= month <= 12) or year < 2020:
            raise ValueError("Invalid year or month")
        
        # Get earnings
        earnings = await EarningsService.calculate_monthly_earnings(
            delivery_boy_id,
            year,
            month
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": earnings
            }
        )
    
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content={"detail": f"Invalid date range: {str(e)}"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to get monthly earnings: {str(e)}"}
        )


@router.get("/my-statement")
async def get_earnings_statement(
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD"),
    authorization: str = Header(None)
):
    """
    Get comprehensive earnings statement for date range
    
    Query Params:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
    
    Returns:
        Detailed earnings statement with all metrics and daily breakdown
    """
    try:
        # Verify auth
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Check if delivery boy
        delivery_boy_id = user.get("delivery_boy_id")
        if not delivery_boy_id:
            raise HTTPException(
                status_code=403,
                detail="Only delivery boys can access earnings"
            )
        
        # Validate dates
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        if start > end:
            raise ValueError("start_date cannot be after end_date")
        
        if (end - start).days > 365:
            raise ValueError("Date range cannot exceed 365 days")
        
        # Get statement
        statement = await EarningsService.get_earnings_statement(
            delivery_boy_id,
            start_date,
            end_date
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": statement
            }
        )
    
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content={"detail": f"Invalid date range: {str(e)}"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to get earnings statement: {str(e)}"}
        )


@router.get("/my-summary")
async def get_personal_summary(
    authorization: str = Header(None)
):
    """
    Get personal earnings summary (lifetime & current period)
    
    Returns:
        Comprehensive summary with current month, last 30 days, and lifetime stats
    """
    try:
        # Verify auth
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Check if delivery boy
        delivery_boy_id = user.get("delivery_boy_id")
        if not delivery_boy_id:
            raise HTTPException(
                status_code=403,
                detail="Only delivery boys can access earnings"
            )
        
        # Get summary
        summary = await EarningsService.get_delivery_boy_summary(delivery_boy_id)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": summary
            }
        )
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to get earnings summary: {str(e)}"}
        )


@router.post("/payout/request")
async def request_payout(
    amount: float = Query(..., gt=0, description="Amount in ₹"),
    payment_method: str = Query("bank_transfer", description="bank_transfer|wallet|upi"),
    authorization: str = Header(None)
):
    """
    Request payout (delivery boy only)
    
    Query Params:
        amount: Amount to request (₹)
        payment_method: bank_transfer, wallet, or upi
    
    Returns:
        Payout request details
    """
    try:
        # Verify auth
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Check if delivery boy
        delivery_boy_id = user.get("delivery_boy_id")
        if not delivery_boy_id:
            raise HTTPException(
                status_code=403,
                detail="Only delivery boys can request payouts"
            )
        
        # Validate payment method
        valid_methods = ["bank_transfer", "wallet", "upi"]
        if payment_method not in valid_methods:
            raise ValueError(f"Invalid payment method. Must be one of: {valid_methods}")
        
        # Get available balance
        summary = await EarningsService.get_delivery_boy_summary(delivery_boy_id)
        available_balance = summary["current_month"]["total_earnings"]
        
        if amount > available_balance:
            raise ValueError(f"Insufficient balance. Available: ₹{available_balance}")
        
        # Create payout request
        payout_request = await EarningsService.request_payout(
            delivery_boy_id,
            amount,
            payment_method
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Payout request created",
                "data": payout_request
            }
        )
    
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content={"detail": str(e)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to create payout request: {str(e)}"}
        )


# ===== ADMIN ENDPOINTS =====

@router.get("/admin/delivery-boy/{delivery_boy_id}/daily/{date_str}")
async def admin_get_daily_earnings(
    delivery_boy_id: str,
    date_str: str,
    authorization: str = Header(None)
):
    """
    Admin: Get any delivery boy's daily earnings
    
    Role: admin, delivery_ops
    """
    try:
        # Verify auth
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Check authorization
        if user.get("role") not in ["admin", "delivery_ops"]:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )
        
        # Get earnings
        earnings = await EarningsService.calculate_daily_earnings(
            delivery_boy_id,
            date_str
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": earnings
            }
        )
    
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content={"detail": str(e)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to get earnings: {str(e)}"}
        )


@router.get("/admin/delivery-boy/{delivery_boy_id}/summary")
async def admin_get_summary(
    delivery_boy_id: str,
    authorization: str = Header(None)
):
    """
    Admin: Get any delivery boy's earnings summary
    
    Role: admin, delivery_ops
    """
    try:
        # Verify auth
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Check authorization
        if user.get("role") not in ["admin", "delivery_ops"]:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )
        
        # Get summary
        summary = await EarningsService.get_delivery_boy_summary(delivery_boy_id)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": summary
            }
        )
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to get summary: {str(e)}"}
        )


@router.post("/admin/payout/approve")
async def admin_approve_payout(
    payout_request_id: str = Query(...),
    authorization: str = Header(None)
):
    """
    Admin: Approve payout request
    
    Role: admin
    """
    try:
        # Verify auth
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Check authorization
        if user.get("role") != "admin":
            raise HTTPException(
                status_code=403,
                detail="Only admins can approve payouts"
            )
        
        # Approve payout
        result = await EarningsService.approve_payout(
            payout_request_id,
            user.get("_id")
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": result["success"],
                "message": result["message"]
            }
        )
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to approve payout: {str(e)}"}
        )


@router.get("/admin/all-delivery-boys/summary")
async def admin_get_all_summary(
    authorization: str = Header(None)
):
    """
    Admin: Get summary for all delivery boys
    
    Role: admin, delivery_ops
    
    Returns:
        List of all delivery boys with their earnings
    """
    try:
        # Verify auth
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Check authorization
        if user.get("role") not in ["admin", "delivery_ops"]:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )
        
        # Get all delivery boys
        delivery_boys = await db.delivery_boys_v2.find({}).to_list(None)
        
        summaries = []
        for db_boy in delivery_boys:
            try:
                summary = await EarningsService.get_delivery_boy_summary(
                    db_boy.get("_id")
                )
                summaries.append(summary)
            except:
                continue
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "count": len(summaries),
                "data": summaries
            }
        )
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to get summaries: {str(e)}"}
        )


@router.get("/admin/pending-payouts")
async def admin_get_pending_payouts(
    authorization: str = Header(None)
):
    """
    Admin: Get all pending payout requests
    
    Role: admin
    """
    try:
        # Verify auth
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Check authorization
        if user.get("role") != "admin":
            raise HTTPException(
                status_code=403,
                detail="Only admins can view pending payouts"
            )
        
        # Get pending payouts
        payouts = await db.payout_requests.find({
            "status": "PENDING"
        }).to_list(None)
        
        # Convert ObjectId to string
        for payout in payouts:
            payout["_id"] = str(payout["_id"])
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "count": len(payouts),
                "data": payouts
            }
        )
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to get pending payouts: {str(e)}"}
        )


__all__ = ["router"]

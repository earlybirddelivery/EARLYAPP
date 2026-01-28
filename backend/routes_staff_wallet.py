"""
routes_staff_wallet.py - Staff Wallet & Earnings REST API
==========================================================

REST API endpoints for staff earnings, bonuses, deductions, and payout management.

Features:
- Get daily/monthly earnings
- Apply bonuses and deductions
- Generate monthly statements
- Manage payout requests
- Wallet summary and history

Author: AI Agent
Date: January 27, 2026
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, date, timedelta
import uuid

from database import db
from models import (
    DailyEarningsCreate, PayoutRequestCreate, PayoutRequestUpdate,
    BonusApply, DeductionApply, PayoutStatus, PaymentMethod
)
from auth import get_current_user, verify_role
from earnings_engine import EarningsEngine

router = APIRouter(prefix="/api/staff/wallet", tags=["Staff Wallet"])

# ==================== Daily Earnings ====================

@router.post("/earnings/daily")
async def create_daily_earnings(
    earnings_data: DailyEarningsCreate,
    current_user = Depends(get_current_user)
):
    """
    Create daily earnings record for staff member
    
    Args:
        earnings_data: Daily earnings details
        current_user: Current authenticated user
    
    Returns:
        Created earnings record with breakdown
    """
    
    try:
        # Verify admin or self
        if current_user["role"] != "ADMIN" and current_user["id"] != earnings_data.staff_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Calculate earnings
        earnings_calc = await EarningsEngine.calculate_daily_earnings(
            staff_id=earnings_data.staff_id,
            date_str=earnings_data.date,
            deliveries_completed=earnings_data.deliveries_completed,
            rating=earnings_data.rating,
            on_time_percentage=earnings_data.on_time_percentage,
            complaints=earnings_data.complaints
        )
        
        # Save to database
        earnings_id = await EarningsEngine.save_daily_earnings(earnings_calc)
        
        return {
            "success": True,
            "earnings_id": earnings_id,
            "data": earnings_calc
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create earnings: {str(e)}")


@router.get("/earnings/today/{staff_id}")
async def get_today_earnings(
    staff_id: str,
    current_user = Depends(get_current_user)
):
    """Get today's earnings for staff member"""
    
    try:
        # Verify access
        if current_user["role"] != "ADMIN" and current_user["id"] != staff_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        today = date.today().isoformat()
        earnings = await EarningsEngine.get_daily_earnings(staff_id, today)
        
        if not earnings:
            return {"success": True, "data": None}
        
        return {"success": True, "data": earnings}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch earnings: {str(e)}")


@router.get("/earnings/date/{staff_id}")
async def get_earnings_by_date(
    staff_id: str,
    date_str: str = Query(..., description="Date in YYYY-MM-DD format"),
    current_user = Depends(get_current_user)
):
    """Get earnings for specific date"""
    
    try:
        if current_user["role"] != "ADMIN" and current_user["id"] != staff_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        earnings = await EarningsEngine.get_daily_earnings(staff_id, date_str)
        
        return {"success": True, "data": earnings}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch earnings: {str(e)}")


@router.get("/earnings/range/{staff_id}")
async def get_earnings_range(
    staff_id: str,
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD"),
    current_user = Depends(get_current_user)
):
    """Get earnings for date range"""
    
    try:
        if current_user["role"] != "ADMIN" and current_user["id"] != staff_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        earnings = await EarningsEngine.get_earnings_range(staff_id, start_date, end_date)
        
        return {
            "success": True,
            "count": len(earnings),
            "data": earnings
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch earnings: {str(e)}")


# ==================== Monthly Statements ====================

@router.get("/statement/{staff_id}/{month}")
async def get_monthly_statement(
    staff_id: str,
    month: str = Query(..., description="Month in YYYY-MM format"),
    current_user = Depends(get_current_user)
):
    """
    Get monthly earnings statement
    
    Args:
        staff_id: Delivery staff ID
        month: Month in YYYY-MM format
    
    Returns:
        Monthly aggregated statement with totals and averages
    """
    
    try:
        if current_user["role"] != "ADMIN" and current_user["id"] != staff_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Check if statement already exists
        statement = await db.staff_statements.find_one({
            "staff_id": staff_id,
            "month": month
        })
        
        if statement:
            return {"success": True, "data": statement}
        
        # Generate new statement
        statement = await EarningsEngine.generate_monthly_statement(staff_id, month)
        
        if not statement:
            return {
                "success": True,
                "data": None,
                "message": "No earnings found for this month"
            }
        
        return {"success": True, "data": statement}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch statement: {str(e)}")


@router.get("/statements/{staff_id}")
async def get_all_statements(
    staff_id: str,
    limit: int = Query(12, description="Number of months"),
    current_user = Depends(get_current_user)
):
    """Get all monthly statements for staff"""
    
    try:
        if current_user["role"] != "ADMIN" and current_user["id"] != staff_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        statements = await db.staff_statements.find({
            "staff_id": staff_id
        }).sort("month", -1).limit(limit).to_list(limit)
        
        return {"success": True, "count": len(statements), "data": statements}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch statements: {str(e)}")


# ==================== Wallet Summary ====================

@router.get("/summary/{staff_id}")
async def get_wallet_summary(
    staff_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get wallet summary with current balance and statistics
    
    Returns:
        - Today's earnings
        - Current month earnings
        - Pending payout amount
        - Lifetime earnings
        - Average rating
        - On-time percentage
        - Pending requests
    """
    
    try:
        if current_user["role"] != "ADMIN" and current_user["id"] != staff_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        summary = await EarningsEngine.get_wallet_summary(staff_id)
        
        return {"success": True, "data": summary}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")


# ==================== Bonuses ====================

@router.post("/bonus/apply")
async def apply_bonus(
    bonus_data: BonusApply,
    current_user = Depends(get_current_user)
):
    """
    Apply bonus to earnings (Admin only)
    
    Types:
    - ON_TIME: On-time delivery bonus
    - RATING: Rating-based bonus
    - COMPLETION: Completion bonus
    - PERFORMANCE: Performance bonus
    """
    
    try:
        # Verify admin
        await verify_role(current_user, "ADMIN")
        
        # Verify earnings exists
        earnings = await db.staff_earnings.find_one({"id": bonus_data.earnings_id})
        if not earnings:
            raise HTTPException(status_code=404, detail="Earnings record not found")
        
        # Create bonus record
        bonus_record = {
            "id": str(uuid.uuid4()),
            "staff_id": bonus_data.staff_id,
            "earnings_id": bonus_data.earnings_id,
            "bonus_type": bonus_data.bonus_type,
            "amount": bonus_data.amount,
            "reason": bonus_data.reason,
            "created_by": current_user["id"],
            "created_at": datetime.now().isoformat()
        }
        
        await db.staff_bonuses.insert_one(bonus_record)
        
        # Update earnings
        await db.staff_earnings.update_one(
            {"id": bonus_data.earnings_id},
            {
                "$inc": {
                    "bonus_amount": bonus_data.amount,
                    "net_earnings": bonus_data.amount
                },
                "$set": {"updated_at": datetime.now().isoformat()}
            }
        )
        
        return {
            "success": True,
            "bonus_id": bonus_record["id"],
            "message": f"Bonus of ₹{bonus_data.amount} applied successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply bonus: {str(e)}")


@router.get("/bonuses/{staff_id}")
async def get_bonuses(
    staff_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
):
    """Get bonuses for staff member"""
    
    try:
        if current_user["role"] != "ADMIN" and current_user["id"] != staff_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        query = {"staff_id": staff_id}
        
        if start_date and end_date:
            query["created_at"] = {
                "$gte": start_date,
                "$lte": end_date
            }
        
        bonuses = await db.staff_bonuses.find(query).sort("created_at", -1).to_list(100)
        
        return {
            "success": True,
            "count": len(bonuses),
            "data": bonuses
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch bonuses: {str(e)}")


# ==================== Deductions ====================

@router.post("/deduction/apply")
async def apply_deduction(
    deduction_data: DeductionApply,
    current_user = Depends(get_current_user)
):
    """
    Apply deduction to earnings (Admin only)
    
    Types:
    - COMPLAINT: Customer complaint
    - DAMAGE: Damaged delivery item
    - LATE_RETURN: Late container return
    - DISCIPLINARY: Disciplinary action
    """
    
    try:
        await verify_role(current_user, "ADMIN")
        
        earnings = await db.staff_earnings.find_one({"id": deduction_data.earnings_id})
        if not earnings:
            raise HTTPException(status_code=404, detail="Earnings record not found")
        
        deduction_record = {
            "id": str(uuid.uuid4()),
            "staff_id": deduction_data.staff_id,
            "earnings_id": deduction_data.earnings_id,
            "deduction_type": deduction_data.deduction_type,
            "amount": deduction_data.amount,
            "reason": deduction_data.reason,
            "reference_id": deduction_data.reference_id,
            "created_by": current_user["id"],
            "created_at": datetime.now().isoformat()
        }
        
        await db.staff_deductions.insert_one(deduction_record)
        
        # Update earnings
        await db.staff_earnings.update_one(
            {"id": deduction_data.earnings_id},
            {
                "$inc": {
                    "deductions_amount": deduction_data.amount,
                    "net_earnings": -deduction_data.amount
                },
                "$set": {"updated_at": datetime.now().isoformat()}
            }
        )
        
        return {
            "success": True,
            "deduction_id": deduction_record["id"],
            "message": f"Deduction of ₹{deduction_data.amount} applied successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply deduction: {str(e)}")


@router.get("/deductions/{staff_id}")
async def get_deductions(
    staff_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
):
    """Get deductions for staff member"""
    
    try:
        if current_user["role"] != "ADMIN" and current_user["id"] != staff_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        query = {"staff_id": staff_id}
        
        if start_date and end_date:
            query["created_at"] = {
                "$gte": start_date,
                "$lte": end_date
            }
        
        deductions = await db.staff_deductions.find(query).sort("created_at", -1).to_list(100)
        
        return {
            "success": True,
            "count": len(deductions),
            "data": deductions
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch deductions: {str(e)}")


# ==================== Payout Requests ====================

@router.post("/payout/request")
async def request_payout(
    payout_data: PayoutRequestCreate,
    current_user = Depends(get_current_user)
):
    """
    Create payout request
    
    Payment Methods:
    - BANK_TRANSFER
    - UPI
    - WALLET
    - CASH
    """
    
    try:
        # Verify staff member
        if current_user["role"] != "ADMIN" and current_user["id"] != payout_data.staff_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Verify wallet balance
        summary = await EarningsEngine.get_wallet_summary(payout_data.staff_id)
        available_balance = summary.get("month_earnings", 0) - summary.get("pending_payout", 0)
        
        if payout_data.amount > available_balance:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Available: ₹{available_balance}"
            )
        
        # Validate payment method details
        if payout_data.payment_method == "BANK_TRANSFER" and not payout_data.bank_details:
            raise HTTPException(status_code=400, detail="Bank details required")
        
        if payout_data.payment_method == "UPI" and not payout_data.upi_id:
            raise HTTPException(status_code=400, detail="UPI ID required")
        
        # Create payout request
        payout_id = await EarningsEngine.request_payout(
            staff_id=payout_data.staff_id,
            amount=payout_data.amount,
            payment_method=payout_data.payment_method,
            bank_details=payout_data.bank_details,
            upi_id=payout_data.upi_id,
            notes=payout_data.notes
        )
        
        return {
            "success": True,
            "payout_id": payout_id,
            "message": f"Payout request of ₹{payout_data.amount} created successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create payout request: {str(e)}")


@router.get("/payout/{payout_id}")
async def get_payout(
    payout_id: str,
    current_user = Depends(get_current_user)
):
    """Get payout request details"""
    
    try:
        payout = await db.staff_payouts.find_one({"id": payout_id})
        
        if not payout:
            raise HTTPException(status_code=404, detail="Payout not found")
        
        # Verify access
        if current_user["role"] != "ADMIN" and current_user["id"] != payout.get("staff_id"):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return {"success": True, "data": payout}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch payout: {str(e)}")


@router.get("/payouts/{staff_id}")
async def get_staff_payouts(
    staff_id: str,
    status: Optional[str] = Query(None),
    limit: int = Query(50),
    current_user = Depends(get_current_user)
):
    """Get payout history for staff member"""
    
    try:
        if current_user["role"] != "ADMIN" and current_user["id"] != staff_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        query = {"staff_id": staff_id}
        if status:
            query["status"] = status
        
        payouts = await EarningsEngine.get_payout_history(staff_id, limit)
        
        return {
            "success": True,
            "count": len(payouts),
            "data": payouts
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch payouts: {str(e)}")


@router.put("/payout/{payout_id}/approve")
async def approve_payout(
    payout_id: str,
    current_user = Depends(get_current_user)
):
    """Approve payout request (Admin only)"""
    
    try:
        await verify_role(current_user, "ADMIN")
        
        success = await EarningsEngine.approve_payout(payout_id, current_user["id"])
        
        if not success:
            raise HTTPException(status_code=404, detail="Payout not found")
        
        return {
            "success": True,
            "message": "Payout approved successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve payout: {str(e)}")


@router.put("/payout/{payout_id}/process")
async def process_payout(
    payout_id: str,
    reference_id: str = Query(..., description="Payment reference/transaction ID"),
    current_user = Depends(get_current_user)
):
    """Mark payout as processed (Admin only)"""
    
    try:
        await verify_role(current_user, "ADMIN")
        
        success = await EarningsEngine.process_payout(payout_id, reference_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Payout not found")
        
        return {
            "success": True,
            "message": "Payout marked as completed",
            "reference_id": reference_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process payout: {str(e)}")


@router.put("/payout/{payout_id}/fail")
async def fail_payout(
    payout_id: str,
    failure_reason: str = Query(...),
    current_user = Depends(get_current_user)
):
    """Mark payout as failed (Admin only)"""
    
    try:
        await verify_role(current_user, "ADMIN")
        
        success = await EarningsEngine.fail_payout(payout_id, failure_reason)
        
        if not success:
            raise HTTPException(status_code=404, detail="Payout not found")
        
        return {
            "success": True,
            "message": "Payout marked as failed",
            "failure_reason": failure_reason
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update payout: {str(e)}")


# ==================== Admin Payout Management ====================

@router.get("/admin/payouts")
async def get_all_pending_payouts(
    status: Optional[str] = Query(None),
    limit: int = Query(100),
    current_user = Depends(get_current_user)
):
    """Get all pending payouts (Admin only)"""
    
    try:
        await verify_role(current_user, "ADMIN")
        
        query = {}
        if status:
            query["status"] = status
        else:
            # Default to pending and approved
            query["status"] = {"$in": ["requested", "approved", "processing"]}
        
        payouts = await db.staff_payouts.find(query).sort("requested_at", 1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "count": len(payouts),
            "data": payouts
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch payouts: {str(e)}")


@router.get("/admin/report/monthly/{month}")
async def get_monthly_report(
    month: str = Query(..., description="Month in YYYY-MM format"),
    current_user = Depends(get_current_user)
):
    """Get monthly earnings report (Admin only)"""
    
    try:
        await verify_role(current_user, "ADMIN")
        
        statements = await db.staff_statements.find({
            "month": month
        }).to_list(1000)
        
        if not statements:
            return {
                "success": True,
                "month": month,
                "total_staff": 0,
                "report": None
            }
        
        # Calculate totals
        total_deliveries = sum(s.get("total_deliveries", 0) for s in statements)
        total_base_earnings = sum(s.get("base_earnings", 0) for s in statements)
        total_bonuses = sum(s.get("total_bonuses", 0) for s in statements)
        total_deductions = sum(s.get("total_deductions", 0) for s in statements)
        total_net_earnings = sum(s.get("net_earnings", 0) for s in statements)
        avg_rating = sum(s.get("average_rating", 0) for s in statements) / len(statements) if statements else 0
        
        return {
            "success": True,
            "month": month,
            "total_staff": len(statements),
            "summary": {
                "total_deliveries": total_deliveries,
                "base_earnings": round(total_base_earnings, 2),
                "total_bonuses": round(total_bonuses, 2),
                "total_deductions": round(total_deductions, 2),
                "net_earnings": round(total_net_earnings, 2),
                "average_rating": round(avg_rating, 2)
            },
            "statements": statements
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

"""
routes_product_requests.py - Product Request Queue API Endpoints
Customer product requests and admin approval workflow
"""

from fastapi import APIRouter, HTTPException, Header, Body, Query
from typing import Optional
from product_request_engine import ProductRequestEngine
from auth import verify_token

router = APIRouter(prefix="/api/product-requests", tags=["Product Requests"])


# ==================== CUSTOMER ENDPOINTS ====================

@router.post("/create")
async def create_product_request(
    request_data: dict = Body(...),
    authorization: str = Header(None)
):
    """
    Customer creates product request
    
    Request body:
    {
      "product_name": "Organic Milk",
      "description": "1L organic milk package",
      "category": "Dairy",
      "estimated_price": 120,
      "urgency": "high",
      "notes": "Needed for daily use"
    }
    """
    try:
        # Verify token
        user_id = verify_token(authorization)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Validate required fields
        if not request_data.get("product_name"):
            raise HTTPException(status_code=400, detail="Product name is required")

        if not request_data.get("description"):
            raise HTTPException(status_code=400, detail="Description is required")

        # Create request
        request = ProductRequestEngine.create_request(
            customer_id=user_id,
            product_name=request_data.get("product_name"),
            description=request_data.get("description"),
            category=request_data.get("category"),
            estimated_price=request_data.get("estimated_price"),
            urgency=request_data.get("urgency", "normal"),
            notes=request_data.get("notes")
        )

        return {
            "success": True,
            "message": "Request created successfully",
            "request": request
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating request: {str(e)}")


@router.get("/my-requests")
async def get_my_requests(authorization: str = Header(None)):
    """Get requests from current customer"""
    try:
        user_id = verify_token(authorization)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        requests = ProductRequestEngine.get_customer_requests(user_id)

        return {
            "success": True,
            "requests": requests,
            "count": len(requests)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{request_id}")
async def get_request_details(
    request_id: str,
    authorization: str = Header(None)
):
    """Get specific request details"""
    try:
        user_id = verify_token(authorization)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        request = ProductRequestEngine.get_request(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")

        return {
            "success": True,
            "request": request
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{request_id}/upvote")
async def upvote_request(
    request_id: str,
    authorization: str = Header(None)
):
    """
    Upvote a request (show interest)
    Multiple customers can upvote the same request
    """
    try:
        user_id = verify_token(authorization)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        success = ProductRequestEngine.upvote_request(request_id, user_id)

        if not success:
            return {
                "success": False,
                "message": "Already voted or request not found"
            }

        updated = ProductRequestEngine.get_request(request_id)

        return {
            "success": True,
            "message": "Vote added",
            "votes": updated.get("votes")
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ADMIN ENDPOINTS ====================

@router.get("")
async def list_requests(
    status: Optional[str] = Query(None),
    sort_by: str = Query("votes"),
    skip: int = Query(0),
    limit: int = Query(20),
    authorization: str = Header(None)
):
    """
    List all product requests (ADMIN)
    
    Query params:
    - status: Filter by PENDING, APPROVED, REJECTED
    - sort_by: votes, created_at, urgency
    - skip: Pagination offset
    - limit: Results per page
    """
    try:
        user_id = verify_token(authorization)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # TODO: Check admin role
        # if not is_admin(user_id):
        #     raise HTTPException(status_code=403, detail="Admin access required")

        requests = ProductRequestEngine.list_requests(
            status=status,
            skip=skip,
            limit=limit,
            sort_by=sort_by
        )

        return {
            "success": True,
            "requests": requests,
            "count": len(requests)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{request_id}/approve")
async def approve_request(
    request_id: str,
    notes_data: dict = Body(...),
    authorization: str = Header(None)
):
    """
    Admin approves a product request
    
    Request body:
    {
      "admin_notes": "Will add this product next week"
    }
    """
    try:
        user_id = verify_token(authorization)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # TODO: Check admin role

        updated = ProductRequestEngine.approve_request(
            request_id=request_id,
            admin_id=user_id,
            admin_notes=notes_data.get("admin_notes")
        )

        return {
            "success": True,
            "message": "Request approved",
            "request": updated
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{request_id}/reject")
async def reject_request(
    request_id: str,
    rejection_data: dict = Body(...),
    authorization: str = Header(None)
):
    """
    Admin rejects a product request
    
    Request body:
    {
      "rejection_reason": "Product not available in market",
      "admin_notes": "Check again in Q2"
    }
    """
    try:
        user_id = verify_token(authorization)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # TODO: Check admin role

        if not rejection_data.get("rejection_reason"):
            raise HTTPException(status_code=400, detail="Rejection reason is required")

        updated = ProductRequestEngine.reject_request(
            request_id=request_id,
            admin_id=user_id,
            rejection_reason=rejection_data.get("rejection_reason"),
            admin_notes=rejection_data.get("admin_notes")
        )

        return {
            "success": True,
            "message": "Request rejected",
            "request": updated
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/statistics")
async def get_statistics(authorization: str = Header(None)):
    """
    Get product request statistics (ADMIN)
    """
    try:
        user_id = verify_token(authorization)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # TODO: Check admin role

        stats = ProductRequestEngine.get_statistics()

        return {
            "success": True,
            "statistics": stats
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

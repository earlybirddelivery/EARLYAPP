from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, date as date_type, timedelta
from pydantic import BaseModel
import uuid
from database import db
from auth import get_current_user

router = APIRouter(tags=["Delivery Operations"])

# ==================== HELPER FUNCTION ====================

async def find_subscription(customer_id: str, product_id: str):
    """Find subscription supporting both camelCase and snake_case field names"""
    # Try snake_case first
    subscription = await db.subscriptions_v2.find_one({
        "$or": [
            {"customer_id": customer_id, "product_id": product_id},
            {"customerId": customer_id, "productId": product_id}
        ],
        "status": {"$in": ["active", "paused"]}
    })
    return subscription

# ==================== REQUEST MODELS ====================

class QuantityOverride(BaseModel):
    customer_id: str
    product_id: str
    date: str  # YYYY-MM-DD
    quantity: int

class DeliveryPause(BaseModel):
    customer_id: str
    product_id: str
    start_date: str  # YYYY-MM-DD
    end_date: Optional[str] = None  # YYYY-MM-DD or None for single date

class DeliveryStop(BaseModel):
    customer_id: str
    product_id: str
    reason: Optional[str] = None  # Optional reason for stopping

class DeliveryBoyOverride(BaseModel):
    customer_id: str
    product_id: str
    date: str  # YYYY-MM-DD
    delivery_boy: str

class ShiftOverride(BaseModel):
    customer_id: str
    product_id: str
    date: str  # YYYY-MM-DD
    shift: str  # morning or evening

class AddProductDelivery(BaseModel):
    customer_id: str
    product_id: str
    date: str  # YYYY-MM-DD
    quantity: int

class DeliveryNotes(BaseModel):
    customer_id: str
    date: str  # YYYY-MM-DD
    notes: str

class UpdateSubscriptionQuantity(BaseModel):
    default_qty: int

class UpdateSubscriptionDeliveryBoy(BaseModel):
    delivery_boy: str

class UpdateSubscriptionShift(BaseModel):
    shift: str

class PauseSubscription(BaseModel):
    pause_start: str  # YYYY-MM-DD
    pause_end: Optional[str] = None  # YYYY-MM-DD or None for indefinite

# ==================== DAY-SPECIFIC OVERRIDES (Today Only) ====================

@router.post("/phase0-v2/delivery/override-quantity")
async def override_quantity(
    override: QuantityOverride,
    current_user: dict = Depends(get_current_user)
):
    """Override quantity for a specific date only (doesn't affect subscription)"""
    try:
        # Find the subscription
        subscription = await find_subscription(override.customer_id, override.product_id)

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        # Check if override already exists for this date
        existing_override = await db.day_overrides.find_one({
            "subscription_id": subscription["id"],
            "date": override.date
        })

        if existing_override:
            # Update existing override
            await db.day_overrides.update_one(
                {"id": existing_override["id"]},
                {"$set": {
                    "quantity": override.quantity,
                    "updated_at": datetime.utcnow().isoformat()
                }}
            )
            return {"message": "Quantity override updated", "override_id": existing_override["id"]}
        else:
            # Create new override
            override_doc = {
                "id": str(uuid.uuid4()),
                "subscription_id": subscription["id"],
                "customer_id": override.customer_id,
                "product_id": override.product_id,
                "date": override.date,
                "quantity": override.quantity,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            await db.day_overrides.insert_one(override_doc)
            return {"message": "Quantity override created", "override_id": override_doc["id"]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to override quantity: {str(e)}")

@router.post("/phase0-v2/delivery/pause")
async def pause_delivery(
    pause: DeliveryPause,
    current_user: dict = Depends(get_current_user)
):
    """Pause delivery for specific date(s) only (doesn't affect subscription)"""
    try:
        print(f"[DEBUG] Pause request: customer_id={pause.customer_id}, product_id={pause.product_id}, start={pause.start_date}, end={pause.end_date}")
        # Find the subscription
        subscription = await find_subscription(pause.customer_id, pause.product_id)

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        # Create pause record(s)
        if pause.end_date:
            # Pause range - add each date
            start = datetime.strptime(pause.start_date, "%Y-%m-%d").date()
            end = datetime.strptime(pause.end_date, "%Y-%m-%d").date()
            current = start
            pause_ids = []

            while current <= end:
                date_str = current.strftime("%Y-%m-%d")

                # Check if already paused
                existing = await db.delivery_pauses.find_one({
                    "subscription_id": subscription["id"],
                    "date": date_str
                })

                if not existing:
                    pause_doc = {
                        "id": str(uuid.uuid4()),
                        "subscription_id": subscription["id"],
                        "customer_id": pause.customer_id,
                        "product_id": pause.product_id,
                        "date": date_str,
                        "created_at": datetime.utcnow().isoformat()
                    }
                    await db.delivery_pauses.insert_one(pause_doc)
                    pause_ids.append(pause_doc["id"])

                current += timedelta(days=1)

            return {"message": f"Delivery paused for {len(pause_ids)} dates", "pause_ids": pause_ids}
        else:
            # Single date pause
            existing = await db.delivery_pauses.find_one({
                "subscription_id": subscription["id"],
                "date": pause.start_date
            })

            if existing:
                return {"message": "Delivery already paused for this date", "pause_id": existing["id"]}

            pause_doc = {
                "id": str(uuid.uuid4()),
                "subscription_id": subscription["id"],
                "customer_id": pause.customer_id,
                "product_id": pause.product_id,
                "date": pause.start_date,
                "created_at": datetime.utcnow().isoformat()
            }
            await db.delivery_pauses.insert_one(pause_doc)
            return {"message": "Delivery paused for this date", "pause_id": pause_doc["id"]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to pause delivery: {str(e)}")

@router.post("/phase0-v2/delivery/override-delivery-boy")
async def override_delivery_boy(
    override: DeliveryBoyOverride,
    current_user: dict = Depends(get_current_user)
):
    """Override delivery boy for a specific date only"""
    try:
        subscription = await find_subscription(override.customer_id, override.product_id)

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        # Check if override already exists
        existing = await db.delivery_boy_overrides.find_one({
            "subscription_id": subscription["id"],
            "date": override.date
        })

        if existing:
            await db.delivery_boy_overrides.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "delivery_boy": override.delivery_boy,
                    "updated_at": datetime.utcnow().isoformat()
                }}
            )
            return {"message": "Delivery boy override updated"}
        else:
            override_doc = {
                "id": str(uuid.uuid4()),
                "subscription_id": subscription["id"],
                "customer_id": override.customer_id,
                "product_id": override.product_id,
                "date": override.date,
                "delivery_boy": override.delivery_boy,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            await db.delivery_boy_overrides.insert_one(override_doc)
            return {"message": "Delivery boy override created"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to override delivery boy: {str(e)}")

@router.post("/phase0-v2/delivery/override-shift")
async def override_shift(
    override: ShiftOverride,
    current_user: dict = Depends(get_current_user)
):
    """Override shift for a specific date only"""
    try:
        subscription = await find_subscription(override.customer_id, override.product_id)

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        existing = await db.shift_overrides.find_one({
            "subscription_id": subscription["id"],
            "date": override.date
        })

        if existing:
            await db.shift_overrides.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "shift": override.shift,
                    "updated_at": datetime.utcnow().isoformat()
                }}
            )
            return {"message": "Shift override updated"}
        else:
            override_doc = {
                "id": str(uuid.uuid4()),
                "subscription_id": subscription["id"],
                "customer_id": override.customer_id,
                "product_id": override.product_id,
                "date": override.date,
                "shift": override.shift,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            await db.shift_overrides.insert_one(override_doc)
            return {"message": "Shift override created"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to override shift: {str(e)}")

@router.post("/phase0-v2/delivery/add-product")
async def add_product_to_delivery(
    add: AddProductDelivery,
    current_user: dict = Depends(get_current_user)
):
    """Add a one-time product to a delivery for a specific date"""
    try:
        print(f"[DEBUG] Add product: customer_id={add.customer_id}, product_id={add.product_id}, date={add.date}, qty={add.quantity}")
        # Verify customer and product exist
        customer = await db.customers_v2.find_one({"id": add.customer_id})
        product = await db.products.find_one({"id": add.product_id})

        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Create irregular delivery entry
        irregular_doc = {
            "id": str(uuid.uuid4()),
            "customer_id": add.customer_id,
            "product_id": add.product_id,
            "date": add.date,
            "quantity": add.quantity,
            "created_at": datetime.utcnow().isoformat(),
            "added_by_id": current_user.get("id"),
            "added_by_name": current_user.get("name") or current_user.get("email", "Unknown")
        }
        await db.irregular_deliveries.insert_one(irregular_doc)

        return {"message": "Product added to delivery", "delivery_id": irregular_doc["id"]}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Add product failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to add product: {str(e)}")

@router.post("/phase0-v2/delivery/add-notes")
async def add_delivery_notes(
    notes: DeliveryNotes,
    current_user: dict = Depends(get_current_user)
):
    """Add special notes/instructions for a specific delivery date"""
    try:
        print(f"[DEBUG] Add notes: customer_id={notes.customer_id}, date={notes.date}, notes={notes.notes[:50] if notes.notes else 'None'}")
        customer = await db.customers_v2.find_one({"id": notes.customer_id})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        # Check if notes already exist for this date
        existing = await db.delivery_notes.find_one({
            "customer_id": notes.customer_id,
            "date": notes.date
        })

        if existing:
            await db.delivery_notes.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "notes": notes.notes,
                    "updated_at": datetime.utcnow().isoformat()
                }}
            )
            return {"message": "Notes updated"}
        else:
            notes_doc = {
                "id": str(uuid.uuid4()),
                "customer_id": notes.customer_id,
                "date": notes.date,
                "notes": notes.notes,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            await db.delivery_notes.insert_one(notes_doc)
            return {"message": "Notes added"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Add notes failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to add notes: {str(e)}")

# ==================== PERMANENT SUBSCRIPTION UPDATES ====================

@router.put("/phase0-v2/subscriptions/{subscription_id}/update-quantity")
async def update_subscription_quantity(
    subscription_id: str,
    update: UpdateSubscriptionQuantity,
    current_user: dict = Depends(get_current_user)
):
    """Update subscription default quantity permanently"""
    try:
        subscription = await db.subscriptions_v2.find_one({"id": subscription_id})
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        await db.subscriptions_v2.update_one(
            {"id": subscription_id},
            {"$set": {
                "default_qty": update.default_qty,
                "updated_at": datetime.utcnow().isoformat()
            }}
        )

        return {"message": "Subscription quantity updated permanently"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update subscription: {str(e)}")

@router.put("/phase0-v2/subscriptions/{subscription_id}/update-delivery-boy")
async def update_subscription_delivery_boy(
    subscription_id: str,
    update: UpdateSubscriptionDeliveryBoy,
    current_user: dict = Depends(get_current_user)
):
    """Update subscription delivery boy permanently"""
    try:
        subscription = await db.subscriptions_v2.find_one({"id": subscription_id})
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        await db.subscriptions_v2.update_one(
            {"id": subscription_id},
            {"$set": {
                "delivery_boy": update.delivery_boy,
                "updated_at": datetime.utcnow().isoformat()
            }}
        )

        return {"message": "Subscription delivery boy updated permanently"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update subscription: {str(e)}")

@router.put("/phase0-v2/subscriptions/{subscription_id}/update-shift")
async def update_subscription_shift(
    subscription_id: str,
    update: UpdateSubscriptionShift,
    current_user: dict = Depends(get_current_user)
):
    """Update subscription shift permanently"""
    try:
        subscription = await db.subscriptions_v2.find_one({"id": subscription_id})
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        await db.subscriptions_v2.update_one(
            {"id": subscription_id},
            {"$set": {
                "shift": update.shift,
                "updated_at": datetime.utcnow().isoformat()
            }}
        )

        return {"message": "Subscription shift updated permanently"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update subscription: {str(e)}")

@router.put("/phase0-v2/subscriptions/{subscription_id}/pause")
async def pause_subscription(
    subscription_id: str,
    pause: PauseSubscription,
    current_user: dict = Depends(get_current_user)
):
    """Pause subscription permanently for a date range"""
    try:
        subscription = await db.subscriptions_v2.find_one({"id": subscription_id})
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        await db.subscriptions_v2.update_one(
            {"id": subscription_id},
            {"$set": {
                "pause_start": pause.pause_start,
                "pause_end": pause.pause_end,
                "status": "paused",
                "updated_at": datetime.utcnow().isoformat()
            }}
        )

        return {"message": "Subscription paused permanently"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to pause subscription: {str(e)}")

# ==================== GET CUSTOMER DETAILS WITH SUBSCRIPTIONS ====================

@router.get("/phase0-v2/customers/{customer_id}")
async def get_customer_details(
    customer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed customer information"""
    try:
        customer = await db.customers_v2.find_one({"id": customer_id}, {"_id": 0})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        return customer

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customer: {str(e)}")

# ==================== HELPER FUNCTIONS ====================

async def apply_delivery_overrides(subscription_id: str, customer_id: str, product_id: str, date_str: str, base_quantity: int, base_shift: str, base_delivery_boy: str):
    """
    Apply all overrides for a specific delivery on a specific date
    Returns: dict with quantity, shift, delivery_boy, is_paused, notes
    """
    result = {
        "quantity": base_quantity,
        "shift": base_shift,
        "delivery_boy": base_delivery_boy,
        "is_paused": False,
        "notes": None
    }

    # Check if delivery is paused for this date
    pause = await db.delivery_pauses.find_one({
        "subscription_id": subscription_id,
        "date": date_str
    })
    if pause:
        result["is_paused"] = True
        return result

    # Apply quantity override
    qty_override = await db.day_overrides.find_one({
        "subscription_id": subscription_id,
        "date": date_str
    })
    if qty_override:
        result["quantity"] = qty_override.get("quantity", base_quantity)

    # Apply shift override
    shift_override = await db.shift_overrides.find_one({
        "subscription_id": subscription_id,
        "date": date_str
    })
    if shift_override:
        result["shift"] = shift_override.get("shift", base_shift)

    # Apply delivery boy override
    boy_override = await db.delivery_boy_overrides.find_one({
        "subscription_id": subscription_id,
        "date": date_str
    })
    if boy_override:
        result["delivery_boy"] = boy_override.get("delivery_boy", base_delivery_boy)

    # Get notes for this delivery
    notes_doc = await db.delivery_notes.find_one({
        "customer_id": customer_id,
        "date": date_str
    })
    if notes_doc:
        result["notes"] = notes_doc.get("notes")

    return result


# ==================== UNPAUSE & REMOVE ENDPOINTS ====================

class UnpauseDelivery(BaseModel):
    customer_id: str
    product_id: str
    date: str  # YYYY-MM-DD

class RemoveAddedProduct(BaseModel):
    delivery_id: str

@router.post("/phase0-v2/delivery/unpause")
async def unpause_delivery(
    data: UnpauseDelivery,
    current_user: dict = Depends(get_current_user)
):
    """Remove a pause for a specific date (undo pause)"""
    try:
        # Find the subscription
        subscription = await find_subscription(data.customer_id, data.product_id)

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        # Delete the pause record
        result = await db.delivery_pauses.delete_one({
            "subscription_id": subscription["id"],
            "date": data.date
        })

        if result.deleted_count == 0:
            return {"message": "No pause found for this date", "deleted": False}

        return {"message": "Delivery unpaused", "deleted": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unpause delivery: {str(e)}")

@router.post("/phase0-v2/delivery/remove-added-product")
async def remove_added_product(
    data: RemoveAddedProduct,
    current_user: dict = Depends(get_current_user)
):
    """Remove a one-time added product (undo add product)"""
    try:
        result = await db.irregular_deliveries.delete_one({"id": data.delivery_id})

        if result.deleted_count == 0:
            return {"message": "Added product not found", "deleted": False}

        return {"message": "Added product removed", "deleted": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove product: {str(e)}")


# ==================== PENDING APPROVALS WORKFLOW ====================

class ApprovalSubmission(BaseModel):
    change_type: str  # pause, add_product, shift_change, quantity_change, delivery_boy_change
    change_data: dict
    reason: Optional[str] = None

class ApprovalAction(BaseModel):
    approval_id: str
    approved: bool
    admin_notes: Optional[str] = None

@router.post("/phase0-v2/delivery/submit-approval")
async def submit_for_approval(
    data: ApprovalSubmission,
    current_user: dict = Depends(get_current_user)
):
    """Submit a delivery change for admin approval"""
    try:
        approval_doc = {
            "id": str(uuid.uuid4()),
            "change_type": data.change_type,
            "change_data": data.change_data,
            "reason": data.reason,
            "status": "pending",
            "submitted_by": {
                "id": current_user.get("id"),
                "name": current_user.get("name"),
                "role": current_user.get("role")
            },
            "submitted_at": datetime.utcnow().isoformat(),
            "reviewed_by": None,
            "reviewed_at": None,
            "admin_notes": None
        }

        await db.pending_approvals.insert_one(approval_doc)

        return {
            "message": "Change submitted for approval",
            "approval_id": approval_doc["id"],
            "status": "pending"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit for approval: {str(e)}")

@router.get("/phase0-v2/delivery/pending-approvals")
async def get_pending_approvals(
    current_user: dict = Depends(get_current_user)
):
    """Get list of pending approvals (admin sees all, staff sees own)"""
    try:
        if current_user.get("role") == "admin":
            # Admin sees all pending approvals
            approvals = await db.pending_approvals.find(
                {"status": "pending"},
                {"_id": 0}
            ).sort("submitted_at", -1).to_list(100)
        else:
            # Staff sees only their own pending approvals
            approvals = await db.pending_approvals.find(
                {
                    "status": "pending",
                    "submitted_by.id": current_user.get("id")
                },
                {"_id": 0}
            ).sort("submitted_at", -1).to_list(100)

        return approvals

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get approvals: {str(e)}")

@router.post("/phase0-v2/delivery/handle-approval")
async def handle_approval(
    data: ApprovalAction,
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject a pending change (admin only)"""
    try:
        # Only admin can approve/reject
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admin can approve changes")

        # Find the approval
        approval = await db.pending_approvals.find_one({"id": data.approval_id})

        if not approval:
            raise HTTPException(status_code=404, detail="Approval not found")

        if approval.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Approval already processed")

        # Update approval status
        await db.pending_approvals.update_one(
            {"id": data.approval_id},
            {"$set": {
                "status": "approved" if data.approved else "rejected",
                "reviewed_by": {
                    "id": current_user.get("id"),
                    "name": current_user.get("name")
                },
                "reviewed_at": datetime.utcnow().isoformat(),
                "admin_notes": data.admin_notes
            }}
        )

        # If approved, execute the change
        if data.approved:
            change_type = approval.get("change_type")
            change_data = approval.get("change_data")

            if change_type == "pause":
                subscription = await find_subscription(
                    change_data.get("customer_id"),
                    change_data.get("product_id")
                )
                if subscription:
                    pause_doc = {
                        "id": str(uuid.uuid4()),
                        "subscription_id": subscription["id"],
                        "customer_id": change_data.get("customer_id"),
                        "product_id": change_data.get("product_id"),
                        "date": change_data.get("start_date"),
                        "created_at": datetime.utcnow().isoformat(),
                        "approved_by": current_user.get("id")
                    }
                    await db.delivery_pauses.insert_one(pause_doc)

            elif change_type == "add_product":
                irregular_doc = {
                    "id": str(uuid.uuid4()),
                    "customer_id": change_data.get("customer_id"),
                    "product_id": change_data.get("product_id"),
                    "date": change_data.get("date"),
                    "quantity": change_data.get("quantity"),
                    "created_at": datetime.utcnow().isoformat(),
                    "approved_by": current_user.get("id")
                }
                await db.irregular_deliveries.insert_one(irregular_doc)

            elif change_type == "shift_change":
                subscription = await find_subscription(
                    change_data.get("customer_id"),
                    change_data.get("product_id")
                )
                if subscription:
                    override_doc = {
                        "id": str(uuid.uuid4()),
                        "subscription_id": subscription["id"],
                        "customer_id": change_data.get("customer_id"),
                        "product_id": change_data.get("product_id"),
                        "date": change_data.get("date"),
                        "shift": change_data.get("shift"),
                        "created_at": datetime.utcnow().isoformat(),
                        "approved_by": current_user.get("id")
                    }
                    await db.shift_overrides.insert_one(override_doc)

            elif change_type == "quantity_change":
                subscription = await find_subscription(
                    change_data.get("customer_id"),
                    change_data.get("product_id")
                )
                if subscription:
                    override_doc = {
                        "id": str(uuid.uuid4()),
                        "subscription_id": subscription["id"],
                        "customer_id": change_data.get("customer_id"),
                        "product_id": change_data.get("product_id"),
                        "date": change_data.get("date"),
                        "quantity": change_data.get("quantity"),
                        "created_at": datetime.utcnow().isoformat(),
                        "approved_by": current_user.get("id")
                    }
                    await db.day_overrides.insert_one(override_doc)

        return {
            "message": "Approved" if data.approved else "Rejected",
            "approval_id": data.approval_id,
            "status": "approved" if data.approved else "rejected"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to handle approval: {str(e)}")

@router.get("/phase0-v2/delivery/added-products")
async def get_added_products(
    date: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all one-time added products for a specific date"""
    try:
        products = await db.irregular_deliveries.find(
            {"date": date},
            {"_id": 0}
        ).to_list(100)

        # Enrich with customer and product info
        for product in products:
            customer = await db.customers_v2.find_one(
                {"id": product.get("customer_id")},
                {"_id": 0, "name": 1, "phone": 1, "address": 1}
            )
            if customer:
                product["customer_name"] = customer.get("name")
                product["customer_phone"] = customer.get("phone")
                product["customer_address"] = customer.get("address")

            prod_info = await db.products.find_one(
                {"id": product.get("product_id")},
                {"_id": 0, "name": 1}
            )
            if prod_info:
                product["product_name"] = prod_info.get("name")

        return products

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get added products: {str(e)}")

@router.get("/phase0-v2/delivery/paused-deliveries")
async def get_paused_deliveries(
    date: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all paused deliveries for a specific date"""
    try:
        pauses = await db.delivery_pauses.find(
            {"date": date},
            {"_id": 0}
        ).to_list(100)

        # Enrich with customer and product info
        for pause in pauses:
            customer = await db.customers_v2.find_one(
                {"id": pause.get("customer_id")},
                {"_id": 0, "name": 1, "phone": 1, "address": 1, "area": 1}
            )
            if customer:
                pause["customer_name"] = customer.get("name")
                pause["customer_phone"] = customer.get("phone")
                pause["customer_address"] = customer.get("address")
                pause["area"] = customer.get("area")

            prod_info = await db.products.find_one(
                {"id": pause.get("product_id")},
                {"_id": 0, "name": 1}
            )
            if prod_info:
                pause["product_name"] = prod_info.get("name")

        return pauses

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get paused deliveries: {str(e)}")

# ==================== GET PAUSED DELIVERIES FOR UI ====================

@router.get("/phase0-v2/delivery/paused")
async def get_paused_deliveries_for_date(
    date: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all paused deliveries for a specific date (for Delivery List Generator UI)"""
    try:
        # Find all pauses for this date
        pauses = await db.delivery_pauses.find(
            {"date": date},
            {"_id": 0}
        ).to_list(1000)

        if not pauses:
            return []

        # Enrich with customer and product information
        result = []
        for pause in pauses:
            # Get customer info
            customer = await db.customers_v2.find_one(
                {"id": pause.get("customer_id")},
                {"_id": 0, "name": 1, "phone": 1, "area": 1, "address": 1}
            )
            
            # Get product info
            product = await db.products.find_one(
                {"id": pause.get("product_id")},
                {"_id": 0, "name": 1}
            )

            # Get subscription for shift and delivery boy
            subscription = await db.subscriptions_v2.find_one(
                {"id": pause.get("subscription_id")},
                {"_id": 0, "shift": 1, "delivery_boy_id": 1, "delivery_boy_name": 1}
            )

            item = {
                "pause_id": pause.get("id"),
                "customer_id": pause.get("customer_id"),
                "customer_name": customer.get("name", "Unknown") if customer else "Unknown",
                "phone": customer.get("phone", "") if customer else "",
                "product_id": pause.get("product_id"),
                "product_name": product.get("name", "Unknown") if product else "Unknown",
                "quantity_packets": 1,  # Paused items typically 1 unit
                "area": customer.get("area", "") if customer else "",
                "shift": subscription.get("shift", "morning") if subscription else "morning",
                "delivery_boy_name": subscription.get("delivery_boy_name", "RUDRESH") if subscription else "RUDRESH",
                "date": pause.get("date"),
                "pause_reason": "Paused for today"
            }
            result.append(item)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get paused deliveries: {str(e)}")

# ==================== GET ADDED PRODUCTS FOR UI ====================

@router.get("/phase0-v2/delivery/added-products")
async def get_added_products_for_date(
    date: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all one-time added products for a specific date (for Delivery List Generator UI)"""
    try:
        # Find all added products (irregular deliveries) for this date
        added = await db.irregular_deliveries.find(
            {"date": date},
            {"_id": 0}
        ).to_list(1000)

        if not added:
            return []

        # Enrich with customer and product information
        result = []
        for item in added:
            # Get customer info
            customer = await db.customers_v2.find_one(
                {"id": item.get("customer_id")},
                {"_id": 0, "name": 1, "phone": 1, "area": 1}
            )
            
            # Get product info
            product = await db.products.find_one(
                {"id": item.get("product_id")},
                {"_id": 0, "name": 1}
            )

            added_item = {
                "id": item.get("id"),
                "customer_id": item.get("customer_id"),
                "customer_name": customer.get("name", "Unknown") if customer else "Unknown",
                "phone": customer.get("phone", "") if customer else "",
                "product_id": item.get("product_id"),
                "product_name": product.get("name", "Unknown") if product else "Unknown",
                "quantity": item.get("quantity", 1),
                "area": customer.get("area", "") if customer else "",
                "date": item.get("date"),
                "added_at": item.get("created_at", datetime.utcnow().isoformat()),
                "added_by_id": item.get("added_by_id", ""),
                "added_by_name": item.get("added_by_name", "Unknown")
            }
            result.append(added_item)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get added products: {str(e)}")

# ==================== DELETE ADDED PRODUCT ====================

@router.delete("/phase0-v2/delivery/added-product/{product_id}")
async def delete_added_product(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an added product record (if added by mistake)"""
    try:
        # Find and delete the added product
        result = await db.irregular_deliveries.delete_one({"id": product_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Added product not found")
        
        return {"success": True, "message": "Added product deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete added product: {str(e)}")

# ==================== STOP DELIVERY (PERMANENT) ====================

@router.post("/phase0-v2/delivery/stop")
async def stop_delivery(
    stop: DeliveryStop,
    current_user: dict = Depends(get_current_user)
):
    """Permanently stop delivery for a product (subscription status changed to 'stopped')"""
    try:
        # Find the subscription
        subscription = await find_subscription(stop.customer_id, stop.product_id)

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        # Create stop record
        stop_doc = {
            "id": str(uuid.uuid4()),
            "subscription_id": subscription["id"],
            "customer_id": stop.customer_id,
            "product_id": stop.product_id,
            "reason": stop.reason or "User requested",
            "stopped_at": datetime.utcnow().isoformat(),
            "status": "active"  # Stop record is active
        }
        await db.delivery_stops.insert_one(stop_doc)

        # Update subscription status to 'stopped'
        await db.subscriptions_v2.update_one(
            {"id": subscription["id"]},
            {"$set": {
                "status": "stopped",
                "stopped_at": datetime.utcnow().isoformat(),
                "stop_reason": stop.reason or "User requested"
            }}
        )

        return {
            "message": "Delivery stopped permanently",
            "stop_id": stop_doc["id"],
            "subscription_id": subscription["id"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop delivery: {str(e)}")

# ==================== GET STOPPED DELIVERIES FOR UI ====================

@router.get("/phase0-v2/delivery/stopped")
async def get_stopped_deliveries_for_date(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all stopped deliveries (optionally filtered by date)"""
    try:
        query = {"status": "active"}
        
        # Find all stopped subscriptions
        stopped_subs = await db.subscriptions_v2.find(
            {"status": "stopped"},
            {"_id": 0}
        ).to_list(1000)

        if not stopped_subs:
            return []

        # Enrich with customer and product information
        result = []
        for sub in stopped_subs:
            # Get customer info
            customer = await db.customers_v2.find_one(
                {"id": sub.get("customer_id")},
                {"_id": 0, "name": 1, "phone": 1, "area": 1}
            )
            
            # Get product info
            product = await db.products.find_one(
                {"id": sub.get("product_id")},
                {"_id": 0, "name": 1}
            )

            # Get stop record
            stop_record = await db.delivery_stops.find_one(
                {"subscription_id": sub.get("id")},
                {"_id": 0}
            )

            item = {
                "stop_id": stop_record.get("id") if stop_record else None,
                "subscription_id": sub.get("id"),
                "customer_id": sub.get("customer_id"),
                "customer_name": customer.get("name", "Unknown") if customer else "Unknown",
                "phone": customer.get("phone", "") if customer else "",
                "product_id": sub.get("product_id"),
                "product_name": product.get("name", "Unknown") if product else "Unknown",
                "area": customer.get("area", "") if customer else "",
                "stopped_at": stop_record.get("stopped_at") if stop_record else sub.get("stopped_at"),
                "reason": stop_record.get("reason") if stop_record else sub.get("stop_reason", "Unknown")
            }
            result.append(item)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stopped deliveries: {str(e)}")

# ==================== STOP DELIVERY ====================

@router.post("/phase0-v2/delivery/stop")
async def stop_delivery(
    stop: DeliveryStop,
    current_user: dict = Depends(get_current_user)
):
    """Permanently stop a subscription for a customer"""
    try:
        print(f"[DEBUG] Stop delivery: customer_id={stop.customer_id}, product_id={stop.product_id}")
        
        # Find the subscription
        subscription = await find_subscription(stop.customer_id, stop.product_id)

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        # Update subscription status to 'stopped'
        await db.subscriptions_v2.update_one(
            {"id": subscription["id"]},
            {"$set": {
                "status": "stopped",
                "stopped_at": datetime.utcnow().isoformat(),
                "stop_reason": stop.reason or "Stopped by admin",
                "stopped_by": current_user.get("id")
            }}
        )

        # Log the action
        await db.delivery_actions.insert_one({
            "action": "stop_delivery",
            "customer_id": stop.customer_id,
            "product_id": stop.product_id,
            "reason": stop.reason,
            "stopped_by": current_user.get("id"),
            "timestamp": datetime.utcnow().isoformat()
        })

        return {"message": "Delivery stopped permanently", "subscription_id": subscription["id"]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop delivery: {str(e)}")

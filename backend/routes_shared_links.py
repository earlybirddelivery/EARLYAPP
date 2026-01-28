"""
Shared Delivery Links - Allow delivery boys to access delivery lists without login
and update delivery status, add product requests, pause/stop requests
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import secrets
from bson import ObjectId

from database import db
from auth import get_current_user, UserRole
from delivery_validators import (
    validate_delivery_date, validate_quantities, calculate_delivery_status,
    prepare_audit_trail, validate_order_status
)

router = APIRouter()

# ==================== MODELS ====================

class SharedLinkCreate(BaseModel):
    name: str
    delivery_boy_id: Optional[str] = None
    delivery_boy_name: Optional[str] = None
    area: Optional[str] = None
    shift: Optional[str] = None
    date: str  # YYYY-MM-DD
    expires_days: int = 30  # Link expires after N days
    auto_renew_daily: bool = True  # Automatically update date daily
    require_login: bool = False  # If True, requires delivery boy to login to access
    added_products: Optional[list] = None  # Additional products to include in the filter

class MarkDeliveredRequest(BaseModel):
    order_id: str  # STEP 20: REQUIRED - Foreign key to db.orders
    customer_id: str
    delivered_at: str
    user_id: Optional[str] = None  # For audit trail when login required
    delivery_type: str = "full"  # 'full' or 'partial'
    delivered_products: Optional[list] = None  # For partial deliveries: [{"product_name": "...", "quantity_packets": 5}, ...]

class AddProductRequest(BaseModel):
    customer_id: str
    product_id: str
    quantity: float
    delivery_date: Optional[str] = None  # If None, means "whenever available"
    notes: Optional[str] = None

class PauseRequest(BaseModel):
    customer_id: str
    reason: str
    notes: Optional[str] = None

class StopRequest(BaseModel):
    customer_id: str
    reason: str
    notes: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

def generate_link_id():
    """Generate a unique link ID"""
    return secrets.token_urlsafe(16)

async def get_deliveries_for_link(link_info: dict):
    """Get deliveries based on link filters"""
    
    # Build query based on link filters
    date = link_info.get('date')
    delivery_boy_name = link_info.get('delivery_boy_name')
    area = link_info.get('area')
    shift = link_info.get('shift')

    # Generate delivery list inline based on subscriptions and customers
    try:
        # Get ALL customers (active and inactive - shared link might be for any customer)
        customers = await db.customers_v2.find({}, {"_id": 0}).to_list(1000)
        
        # Get subscriptions - try both "active" and "paused" status to be inclusive
        subscriptions = await db.subscriptions_v2.find({
            "status": {"$in": ["active", "paused"]}
        }, {"_id": 0}).to_list(1000)
        
        # Get all products
        products = await db.products.find({}, {"_id": 0}).to_list(1000)
        product_map = {p["id"]: p for p in products}
        
        # Get paused deliveries for this date and link
        pause_requests = await db.pause_requests.find({
            "customer_id": {"$in": [c["id"] for c in customers]}
        }, {"_id": 0}).to_list(1000)
        paused_customers = {p["customer_id"]: p for p in pause_requests if p.get("status") != "cancelled"}
        
        # Build subscription lookup by customer_id (handle both camelCase and snake_case)
        subscription_map = {}
        for sub in subscriptions:
            customer_id = sub.get("customerId") or sub.get("customer_id")
            if customer_id not in subscription_map:
                subscription_map[customer_id] = []
            subscription_map[customer_id].append(sub)
        
        delivery_list = []
        serial = 1
        
        for customer in customers:
            # Filter by area if specified
            if area and customer.get("area") != area:
                continue
            
            # Get customer's subscriptions
            customer_subs = subscription_map.get(customer["id"], [])
            
            for subscription in customer_subs:
                # Get shift for this date
                sub_shift = subscription.get("shift", "morning")
                shift_overrides = subscription.get("shift_overrides", [])
                for override in shift_overrides:
                    if override.get("date") == date:
                        sub_shift = override.get("shift")
                        break
                
                # Filter by shift if specified
                if shift and shift != "all" and shift is not None:
                    if shift != sub_shift:
                        continue
                
                # Get product info
                product_id = subscription.get("productId") or subscription.get("product_id")
                product = product_map.get(product_id, {})
                
                # Check if this delivery is paused
                is_paused = customer["id"] in paused_customers
                pause_info = paused_customers.get(customer["id"], {})
                
                delivery_list.append({
                    "serial": serial,
                    "customer_id": customer["id"],
                    "customer_name": customer["name"],
                    "phone": customer["phone"],
                    "address": customer.get("address", ""),
                    "area": customer.get("area", ""),
                    "product_id": product_id,
                    "product_name": product.get("name", "Unknown"),
                    "quantity": subscription.get("quantity", 1),
                    "shift": sub_shift,
                    "price_per_unit": subscription.get("price_per_unit", 0),
                    "notes": customer.get("notes", ""),
                    "status": customer.get("status", "active").capitalize(),
                    "map_link": customer.get("map_link", ""),
                    "subscription_id": subscription.get("id"),
                    "delivery_boy_id": customer.get("delivery_boy_id"),
                    "delivery_boy_name": customer.get("delivery_boy_name", "Unassigned"),
                    "delivery_status": "paused" if is_paused else "active",
                    "pause_reason": pause_info.get("reason", "")
                })
                serial += 1
        
        # Filter by delivery boy name if specified and not "All Boys"
        if delivery_boy_name and delivery_boy_name not in ('All Boys', 'all', None, ''):
            delivery_list = [d for d in delivery_list if d.get('delivery_boy_name') == delivery_boy_name]
        
        return delivery_list
    
    except Exception as e:
        print(f"Error generating deliveries for link: {str(e)}")
        import traceback
        traceback.print_exc()
        return []


# ==================== ROUTES ====================

@router.post("/shared-delivery-links")
async def create_shared_link(
    link_data: SharedLinkCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a shareable delivery link with filters"""
    
    # STEP 24: Require ADMIN role to create shared links
    if current_user.get("role") not in ["admin", "delivery_manager"]:
        raise HTTPException(status_code=403, detail="Only admin or delivery manager can create shared links")
    
    # Generate unique link ID
    link_id = generate_link_id()

    # Calculate expiration date
    expires_at = datetime.utcnow() + timedelta(days=link_data.expires_days)

    # Create link document
    link_doc = {
        "link_id": link_id,
        "name": link_data.name,
        "delivery_boy_id": link_data.delivery_boy_id,
        "delivery_boy_name": link_data.delivery_boy_name,
        "area": link_data.area,
        "shift": link_data.shift,
        "date": link_data.date,
        "auto_renew_daily": link_data.auto_renew_daily,
        "require_login": link_data.require_login,
        "added_products": link_data.added_products or [],  # Store added products
        "created_by": current_user.get('id'),
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
        "access_count": 0,
        "last_accessed": None
    }

    result = await db.shared_delivery_links.insert_one(link_doc)

    # Generate full URL
    frontend_url = "http://localhost:3000"  # TODO: Get from config
    share_url = f"{frontend_url}/shared-delivery/{link_id}"

    return {
        "success": True,
        "link_id": link_id,
        "share_url": share_url,
        "expires_at": expires_at.isoformat()
    }


@router.get("/shared-delivery-links")
async def list_shared_links(current_user: dict = Depends(get_current_user)):
    """List all shared links created by current user"""
    
    links = await db.shared_delivery_links.find({
        "created_by": current_user.get('id')
    }).sort("created_at", -1).to_list(1000)

    # Convert ObjectId to string
    for link in links:
        link['_id'] = str(link['_id'])

    return links


@router.delete("/shared-delivery-links/{link_id}")
async def delete_shared_link(
    link_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a shared link"""
    
    # STEP 24: Require ADMIN role to delete shared links
    if current_user.get("role") not in ["admin", "delivery_manager"]:
        raise HTTPException(status_code=403, detail="Only admin or delivery manager can delete shared links")
    
    result = await db.shared_delivery_links.delete_one({
        "link_id": link_id,
        "created_by": current_user.get('id')
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")

    return {"success": True}


@router.get("/shared-delivery-links/{link_id}/audit-logs")
async def get_link_audit_logs(
    link_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get audit logs for a shared link (access logs and actions)"""
    
    # Verify link belongs to current user
    link = await db.shared_delivery_links.find_one({
        "link_id": link_id,
        "created_by": current_user.get('id')
    })

    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    # Get access logs
    access_logs = await db.link_access_logs.find(
        {"link_id": link_id}
    ).sort("accessed_at", -1).to_list(100)

    # Get action logs
    action_logs = await db.delivery_actions.find(
        {"link_id": link_id}
    ).sort("timestamp", -1).to_list(100)

    # Convert ObjectId to string
    for log in access_logs:
        log['_id'] = str(log['_id'])
    for log in action_logs:
        log['_id'] = str(log['_id'])

    return {
        "link_info": {
            "name": link.get('name'),
            "require_login": link.get('require_login', False)
        },
        "access_logs": access_logs,
        "action_logs": action_logs
    }


@router.get("/shared-delivery-link/{link_id}")
async def get_shared_delivery_list(link_id: str, current_user: Optional[dict] = Depends(lambda: None)):
    """
    Get delivery list from shared link (PUBLIC or AUTH based on link settings)
    """
    
    # Find link
    link = await db.shared_delivery_links.find_one({"link_id": link_id})

    if not link:
        raise HTTPException(status_code=404, detail="Link not found or expired")

    # Check if expired
    expires_at = datetime.fromisoformat(link['expires_at'])
    if datetime.utcnow() > expires_at:
        raise HTTPException(status_code=410, detail="Link has expired")

    # Check if login is required
    require_login = link.get('require_login', False)
    user_info = None

    if require_login:
        # For now, return a flag indicating login is required
        # Frontend will handle the login flow
        return {
            "require_login": True,
            "link_info": {
                "name": link.get('name'),
                "delivery_boy_name": link.get('delivery_boy_name'),
                "area": link.get('area'),
                "shift": link.get('shift'),
                "date": link.get('date')
            }
        }

    # Update date if auto_renew_daily is enabled
    if link.get('auto_renew_daily'):
        today = datetime.utcnow().strftime('%Y-%m-%d')
        link['date'] = today
        # Update in DB
        await db.shared_delivery_links.update_one(
            {"link_id": link_id},
            {"$set": {"date": today}}
        )

    # Update access count and log access
    await db.shared_delivery_links.update_one(
        {"link_id": link_id},
        {
            "$inc": {"access_count": 1},
            "$set": {"last_accessed": datetime.utcnow().isoformat()}
        }
    )

    # Log access for audit trail
    await db.link_access_logs.insert_one({
        "link_id": link_id,
        "user_id": None,
        "user_name": "Anonymous",
        "accessed_at": datetime.utcnow().isoformat(),
        "ip_address": None  # Could be extracted from request
    })

    # Get deliveries
    deliveries = await get_deliveries_for_link(link)
    
    # Transform deliveries to include products array for frontend compatibility
    transformed_deliveries = []
    for delivery in deliveries:
        transformed_deliveries.append({
            "serial": delivery.get("serial"),
            "customer_id": delivery.get("customer_id"),
            "customer_name": delivery.get("customer_name"),
            "phone": delivery.get("phone"),
            "address": delivery.get("address"),
            "area": delivery.get("area"),
            "shift": delivery.get("shift"),
            "status": delivery.get("status"),
            "map_link": delivery.get("map_link"),
            "delivery_boy_name": delivery.get("delivery_boy_name"),
            "delivery_status": "pending",
            "products": [
                {
                    "product_id": delivery.get("product_id"),
                    "product_name": delivery.get("product_name"),
                    "quantity_packets": delivery.get("quantity", 1)
                }
            ]
        })
    
    # Get added products from link
    added_products = link.get('added_products', [])

    return {
        "require_login": False,
        "link_info": {
            "name": link.get('name'),
            "delivery_boy_name": link.get('delivery_boy_name'),
            "area": link.get('area'),
            "shift": link.get('shift'),
            "date": link.get('date')
        },
        "deliveries": transformed_deliveries,
        "added_products": added_products
    }


@router.get("/shared-delivery-link/{link_id}/auth")
async def get_shared_delivery_list_auth(link_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get delivery list from shared link with authentication (for login-required links)
    """
    
    # Find link
    link = await db.shared_delivery_links.find_one({"link_id": link_id})

    if not link:
        raise HTTPException(status_code=404, detail="Link not found or expired")

    # Check if expired
    expires_at = datetime.fromisoformat(link['expires_at'])
    if datetime.utcnow() > expires_at:
        raise HTTPException(status_code=410, detail="Link has expired")

    # Verify user is a delivery boy
    if current_user.get('role') != 'delivery_boy':
        raise HTTPException(status_code=403, detail="Only delivery boys can access this link")

    # Update date if auto_renew_daily is enabled
    if link.get('auto_renew_daily'):
        today = datetime.utcnow().strftime('%Y-%m-%d')
        link['date'] = today
        # Update in DB
        await db.shared_delivery_links.update_one(
            {"link_id": link_id},
            {"$set": {"date": today}}
        )

    # Update access count
    await db.shared_delivery_links.update_one(
        {"link_id": link_id},
        {
            "$inc": {"access_count": 1},
            "$set": {"last_accessed": datetime.utcnow().isoformat()}
        }
    )

    # Log access with user info for audit trail
    await db.link_access_logs.insert_one({
        "link_id": link_id,
        "user_id": current_user.get('id'),
        "user_name": current_user.get('name'),
        "user_role": current_user.get('role'),
        "accessed_at": datetime.utcnow().isoformat(),
        "ip_address": None  # Could be extracted from request
    })

    # Get deliveries
    deliveries = await get_deliveries_for_link(link)
    
    # Transform deliveries to include products array for frontend compatibility
    transformed_deliveries = []
    for delivery in deliveries:
        transformed_deliveries.append({
            "serial": delivery.get("serial"),
            "customer_id": delivery.get("customer_id"),
            "customer_name": delivery.get("customer_name"),
            "phone": delivery.get("phone"),
            "address": delivery.get("address"),
            "area": delivery.get("area"),
            "shift": delivery.get("shift"),
            "status": delivery.get("status"),
            "map_link": delivery.get("map_link"),
            "delivery_boy_name": delivery.get("delivery_boy_name"),
            "delivery_status": "pending",
            "products": [
                {
                    "product_id": delivery.get("product_id"),
                    "product_name": delivery.get("product_name"),
                    "quantity_packets": delivery.get("quantity", 1)
                }
            ]
        })
    
    # Get added products from link
    added_products = link.get('added_products', [])

    return {
        "require_login": False,
        "user_info": {
            "id": current_user.get('id'),
            "name": current_user.get('name'),
            "role": current_user.get('role')
        },
        "link_info": {
            "name": link.get('name'),
            "delivery_boy_name": link.get('delivery_boy_name'),
            "area": link.get('area'),
            "shift": link.get('shift'),
            "date": link.get('date')
        },
        "deliveries": transformed_deliveries,
        "added_products": added_products
    }


@router.post("/shared-delivery-link/{link_id}/mark-delivered")
async def mark_delivered_via_link(link_id: str, data: MarkDeliveredRequest, request):
    """Mark delivery as delivered via shared link (PUBLIC)"""
    
    # Verify link exists
    link = await db.shared_delivery_links.find_one({"link_id": link_id})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # STEP 20: Validate order_id exists in db.orders
    order = await db.orders.find_one({"id": data.order_id}, {"_id": 0})
    validate_order_status(order)
    
    # STEP 27: Validate delivery date using centralized validator
    valid, error = validate_delivery_date(link.get('date'), order.get("delivery_date", link.get('date')))
    if not valid:
        raise HTTPException(status_code=400, detail=error)
    
    # STEP 26: Validate quantities if partial delivery
    if data.delivery_type == "partial" and data.delivered_products:
        valid, error = validate_quantities(data.delivered_products, order.get("items", []))
        if not valid:
            raise HTTPException(status_code=400, detail=error)
    
    now_iso = datetime.utcnow().isoformat()
    
    # STEP 25: Prepare audit trail fields for shared link confirmation
    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown") if request else "unknown"
    
    audit_fields = {
        "confirmed_by_user_id": None,  # Null for shared link
        "confirmed_by_name": None,  # Null for shared link
        "confirmed_at": now_iso,
        "confirmation_method": "shared_link",
        "ip_address": client_host,
        "device_info": user_agent
    }
    
    if data.delivery_type == "partial" and data.delivered_products:
        # Handle partial delivery - mark specific products as delivered
        for product in data.delivered_products:
            # Find the delivery record and update only the specified product quantities
            await db.delivery_status.update_one(
                {
                    "customer_id": data.customer_id,
                    "delivery_date": link.get('date'),
                    "products.product_name": product.get('product_name')
                },
                {
                    "$set": {
                        "order_id": data.order_id,  # STEP 20: Add order_id
                        "products.$.delivered_quantity": product.get('quantity_packets'),
                        "products.$.status": "partially_delivered",
                        "updated_at": datetime.utcnow().isoformat()
                    }
                },
                upsert=False
            )

        # Check if all products are now delivered
        delivery = await db.delivery_status.find_one({
            "customer_id": data.customer_id,
            "delivery_date": link.get('date')
        })

        if delivery and delivery.get('products'):
            # Calculate total delivered vs total quantity
            total_qty = sum(p.get('quantity_packets', 0) for p in delivery['products'])
            total_delivered = sum(p.get('delivered_quantity', 0) for p in delivery['products'])
            
            # Update overall status
            if total_delivered >= total_qty:
                overall_status = "delivered"
            else:
                overall_status = "partially_delivered"

            await db.delivery_status.update_one(
                {
                    "customer_id": data.customer_id,
                    "delivery_date": link.get('date')
                },
                {
                    "$set": {
                        "order_id": data.order_id,  # STEP 20: Add order_id
                        "status": overall_status,
                        "delivered_at": data.delivered_at,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                }
            )
    else:
        # Full delivery
        result = await db.delivery_status.update_one(
            {
                "customer_id": data.customer_id,
                "delivery_date": link.get('date')
            },
            {
                "$set": {
                    "order_id": data.order_id,  # STEP 20: Add order_id
                    "status": "delivered",
                    "delivered_at": data.delivered_at,
                    "updated_at": datetime.utcnow().isoformat()
                }
            },
            upsert=True
        )

    # STEP 22: Update order status when delivery marked complete
    if data.delivery_type == "full":
        # Full delivery - mark order as DELIVERED
        await db.orders.update_one(
            {"id": data.order_id},
            {"$set": {
                "status": "DELIVERED",
                "delivered_at": data.delivered_at or now_iso,
                "delivery_confirmed": True,
                "updated_at": now_iso
            }}
        )
        
        # STEP 22: Also update subscription_v2 if order is linked to subscription
        if order.get("subscription_id"):
            await db.subscriptions_v2.update_one(
                {"id": order["subscription_id"]},
                {"$set": {
                    "last_delivery_date": link.get('date'),
                    "last_delivery_at": data.delivered_at or now_iso,
                    "last_delivery_confirmed": True,
                    "updated_at": now_iso
                }}
            )
    elif data.delivery_type == "partial":
        # Partial delivery - mark order as PARTIALLY_DELIVERED
        await db.orders.update_one(
            {"id": data.order_id},
            {"$set": {
                "status": "PARTIALLY_DELIVERED",
                "delivered_at": data.delivered_at or now_iso,
                "delivery_confirmed": True,
                "partial_delivery_items": [p.get('product_name') for p in data.delivered_products or []],
                "updated_at": now_iso
            }}
        )
    
    # Log the action with user info for audit trail
    await db.delivery_actions.insert_one({
        "link_id": link_id,
        "action": "mark_delivered",
        "delivery_type": data.delivery_type,
        "customer_id": data.customer_id,
        "order_id": data.order_id,  # STEP 20: Add order_id to audit log
        "delivery_date": link.get('date'),
        "user_id": data.user_id,  # Will be set by frontend if logged in
        "performed_by": "authenticated_user" if data.user_id else "anonymous",
        "timestamp": now_iso
    })

    return {"success": True, "order_id": data.order_id, "order_status": "updated"}


@router.post("/shared-delivery-link/{link_id}/add-product")
async def add_product_via_link(link_id: str, data: AddProductRequest):
    """Add product request via shared link (PUBLIC)"""
    
    # Verify link exists
    link = await db.shared_delivery_links.find_one({"link_id": link_id})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    # Create product request
    request_doc = {
        "customer_id": data.customer_id,
        "product_id": data.product_id,
        "quantity": data.quantity,
        "delivery_date": data.delivery_date,  # None means "whenever available"
        "notes": data.notes,
        "requested_via": "shared_link",
        "link_id": link_id,
        "status": "pending",
        "requested_at": datetime.utcnow().isoformat()
    }

    await db.product_requests.insert_one(request_doc)

    # Log the action
    await db.delivery_actions.insert_one({
        "link_id": link_id,
        "action": "add_product",
        "customer_id": data.customer_id,
        "product_id": data.product_id,
        "quantity": data.quantity,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {"success": True, "message": "Product request submitted"}


@router.post("/shared-delivery-link/{link_id}/pause")
async def pause_delivery_via_link(link_id: str, data: PauseRequest):
    """Pause delivery request via shared link (PUBLIC)"""
    
    # Verify link exists
    link = await db.shared_delivery_links.find_one({"link_id": link_id})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    # Create pause request
    pause_doc = {
        "customer_id": data.customer_id,
        "reason": data.reason,
        "notes": data.notes,
        "requested_via": "shared_link",
        "link_id": link_id,
        "status": "pending",
        "requested_at": datetime.utcnow().isoformat()
    }

    await db.pause_requests.insert_one(pause_doc)

    # Log the action
    await db.delivery_actions.insert_one({
        "link_id": link_id,
        "action": "pause_request",
        "customer_id": data.customer_id,
        "reason": data.reason,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {"success": True, "message": "Pause request submitted"}


@router.post("/shared-delivery-link/{link_id}/stop")
async def stop_delivery_via_link(link_id: str, data: StopRequest):
    """Stop delivery request via shared link (PUBLIC)"""
    
    # Verify link exists
    link = await db.shared_delivery_links.find_one({"link_id": link_id})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    # Create stop request
    stop_doc = {
        "customer_id": data.customer_id,
        "reason": data.reason,
        "notes": data.notes,
        "requested_via": "shared_link",
        "link_id": link_id,
        "status": "pending",
        "requested_at": datetime.utcnow().isoformat()
    }

    await db.stop_requests.insert_one(stop_doc)

    # Log the action
    await db.delivery_actions.insert_one({
        "link_id": link_id,
        "action": "stop_request",
        "customer_id": data.customer_id,
        "reason": data.reason,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {"success": True, "message": "Stop request submitted"}

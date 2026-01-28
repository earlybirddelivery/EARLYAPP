"""
MIGRATION 006: Add Quantity Validation Rules
Date: 2026-01-27
Purpose: Ensure deliveries don't exceed ordered quantities

Changes:
1. Add validation to DeliveryStatusUpdate schema
2. Add validation logic to mark-delivered endpoints
3. Ensure delivered_qty <= ordered_qty for all items
4. Handle partial deliveries correctly
"""

async def validate_delivery_quantities(order, delivered_items):
    """
    Validate that delivered items don't exceed ordered quantities
    
    Args:
        order: Order document from db.orders
        delivered_items: List of delivered items from request
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not delivered_items or not order.get("items"):
        return True, None
    
    # Build map of ordered items
    ordered_map = {item["product_id"]: item["quantity"] for item in order.get("items", [])}
    
    # Check each delivered item
    for delivered in delivered_items:
        product_id = delivered.get("product_id")
        delivered_qty = delivered.get("delivered_qty", 0)
        
        if product_id not in ordered_map:
            return False, f"Product {product_id} not in order"
        
        ordered_qty = ordered_map[product_id]
        
        if delivered_qty > ordered_qty:
            return False, f"Cannot deliver {delivered_qty} units of {product_id} (only {ordered_qty} ordered)"
        
        if delivered_qty < 0:
            return False, f"Delivered quantity cannot be negative for {product_id}"
    
    return True, None


async def calculate_delivery_status(delivered_items, ordered_items):
    """
    Calculate overall delivery status based on quantities
    
    Returns: "delivered", "partially_delivered", or "shortage"
    """
    if not delivered_items or not ordered_items:
        return "delivered"
    
    total_ordered = sum(item.get("quantity", 0) for item in ordered_items)
    total_delivered = sum(item.get("delivered_qty", 0) for item in delivered_items)
    
    if total_delivered >= total_ordered:
        return "delivered"
    elif total_delivered > 0:
        return "partially_delivered"
    else:
        return "shortage"


# Migration function (called by run_migrations.py)
async def run(db):
    """
    No database changes needed for this migration
    (Schema already supports quantity tracking)
    """
    print("[MIGRATION 006] Quantity validation rules applied")
    return True

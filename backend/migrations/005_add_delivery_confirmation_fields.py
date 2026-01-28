# ==================================================================================
# MIGRATION 005: Add Delivery Confirmation Audit Fields
# ==================================================================================
# Purpose: Track WHO confirmed delivery and HOW they did it
# Status: Enables audit trail for deliveries (especially shared link deliveries)
# Impact: Critical for accountability and dispute resolution
# ==================================================================================

from datetime import datetime


async def up(db):
    """
    Add audit trail fields to delivery_statuses:
    - confirmed_by_user_id: User who confirmed (null for shared link users)
    - confirmed_by_name: Name of confirmer (for shared links)
    - confirmed_at: Exact timestamp of confirmation
    - confirmation_method: 'delivery_boy' | 'shared_link' | 'admin'
    - ip_address: IP address (for shared link confirmations)
    - device_info: User-agent string (for shared link confirmations)
    """
    try:
        result = await db.delivery_statuses.update_many(
            {},
            {
                "$set": {
                    "confirmed_by_user_id": None,
                    "confirmed_by_name": None,
                    "confirmed_at": None,
                    "confirmation_method": None,
                    "ip_address": None,
                    "device_info": None,
                    "audit_migrated_at": datetime.now().isoformat()
                }
            }
        )
        
        # Create indexes for audit queries
        await db.delivery_statuses.create_index("confirmed_by_user_id")
        await db.delivery_statuses.create_index("confirmation_method")
        await db.delivery_statuses.create_index([
            ("confirmed_at", -1)
        ])
        
        return {
            "success": True,
            "message": "Delivery confirmation audit fields added",
            "modified_count": result.modified_count,
            "fields_added": {
                "confirmed_by_user_id": "User ID (null for shared links)",
                "confirmed_by_name": "Name of confirmer",
                "confirmed_at": "Confirmation timestamp",
                "confirmation_method": "delivery_boy | shared_link | admin",
                "ip_address": "IP address of confirmer",
                "device_info": "Device/browser information"
            },
            "use_cases": [
                "1. Identify which delivery boy confirmed delivery",
                "2. Track shared link confirmations with IP/device info",
                "3. Detect suspicious patterns (same IP, multiple links)",
                "4. Dispute resolution (who confirmed delivery?)",
                "5. Audit trail for compliance"
            ],
            "next_step": "Update delivery confirmation routes to populate these fields"
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to add delivery confirmation audit fields"
        }


async def down(db):
    """
    Rollback: Remove all audit trail fields.
    WARNING: Loses audit information for future queries.
    """
    try:
        result = await db.delivery_statuses.update_many(
            {},
            {
                "$unset": {
                    "confirmed_by_user_id": "",
                    "confirmed_by_name": "",
                    "confirmed_at": "",
                    "confirmation_method": "",
                    "ip_address": "",
                    "device_info": ""
                }
            }
        )
        
        # Drop indexes
        for index_name in [
            "confirmed_by_user_id_1",
            "confirmation_method_1",
            "confirmed_at_-1"
        ]:
            try:
                await db.delivery_statuses.drop_index(index_name)
            except:
                pass
        
        return {
            "success": True,
            "message": "Delivery confirmation audit fields removed",
            "modified_count": result.modified_count,
            "warning": "Audit trail lost - cannot track who confirmed deliveries"
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to rollback audit fields removal"
        }


# Metadata
metadata = {
    "version": 5,
    "name": "add_delivery_confirmation_fields",
    "description": "Add audit trail to delivery confirmations",
    "impact": "Schema change - adds 6 optional fields for audit trail",
    "rollback_safe": True,
    "collection": "delivery_statuses",
    "fields_added": 6,
    "business_impact": "Accountability and dispute resolution",
    "compliance": "Enables compliance audits"
}

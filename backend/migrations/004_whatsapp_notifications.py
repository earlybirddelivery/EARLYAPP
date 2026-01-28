"""
Migration 004: Add WhatsApp Notifications Collections
Creates collections for notification storage and templates
"""

from datetime import datetime, timezone


async def upgrade(db):
    """
    Upgrade to add WhatsApp notifications support
    """
    print("⬆️  Upgrading to migration 004: WhatsApp Notifications...")

    try:
        # Create notification_templates collection
        print("  • Creating notification_templates collection...")
        await db.notification_templates.create_index("type", unique=True)
        await db.notification_templates.create_index("active")
        await db.notification_templates.create_index("created_at")

        # Create notifications_log collection
        print("  • Creating notifications_log collection...")
        await db.notifications_log.create_index("phone")
        await db.notifications_log.create_index("status")
        await db.notifications_log.create_index("created_at")
        await db.notifications_log.create_index("reference_id")
        await db.notifications_log.create_index([("created_at", -1), ("status", 1)])  # Compound index

        # Create notifications_queue collection (for retries)
        print("  • Creating notifications_queue collection...")
        await db.notifications_queue.create_index("retry_at")
        await db.notifications_queue.create_index("message_id", unique=True)

        # Create notification_settings collection (user preferences)
        print("  • Creating notification_settings collection...")
        await db.notification_settings.create_index("user_id", unique=True)
        await db.notification_settings.create_index("phone")

        print("✓ Migration 004 completed successfully!")
        return True

    except Exception as e:
        print(f"✗ Error in migration 004: {str(e)}")
        return False


async def downgrade(db):
    """
    Downgrade - remove WhatsApp notifications support
    """
    print("⬇️  Downgrading from migration 004: WhatsApp Notifications...")

    try:
        # Drop collections
        collections_to_drop = [
            "notification_templates",
            "notifications_log",
            "notifications_queue",
            "notification_settings"
        ]

        for collection_name in collections_to_drop:
            print(f"  • Dropping {collection_name} collection...")
            await db[collection_name].drop()

        print("✓ Downgrade from migration 004 completed!")
        return True

    except Exception as e:
        print(f"✗ Error downgrading migration 004: {str(e)}")
        return False


# Collection schemas for reference
NOTIFICATION_LOG_SCHEMA = {
    "id": "string (uuid)",
    "phone": "string (+919876543210)",
    "type": "string (delivery_reminder, delivery_confirmed, etc)",
    "message": "string (rendered message)",
    "status": "string (queued, sent, delivered, failed)",
    "reference_id": "string (order_id, subscription_id, etc)",
    "context": "object (template variables)",
    "created_at": "timestamp",
    "sent_at": "timestamp or null",
    "delivered_at": "timestamp or null",
    "failed_at": "timestamp or null",
    "error_message": "string or null",
    "retry_count": "number",
    "twilio_message_id": "string or null"
}

NOTIFICATION_TEMPLATES_SCHEMA = {
    "id": "string (uuid)",
    "name": "string (delivery_reminder, etc)",
    "type": "string (message type)",
    "channel": "string (whatsapp)",
    "language": "string (en, hi, etc)",
    "content": "string (template with {{variables}})",
    "active": "boolean",
    "category": "string (reminder, confirmation, billing, etc)",
    "created_at": "timestamp",
    "updated_at": "timestamp"
}

NOTIFICATION_QUEUE_SCHEMA = {
    "_id": "ObjectId (auto)",
    "message_id": "string (fk -> notifications_log.id)",
    "retry_at": "timestamp",
    "retry_count": "number"
}

NOTIFICATION_SETTINGS_SCHEMA = {
    "id": "string (uuid)",
    "user_id": "string (fk -> users.id)",
    "phone": "string",
    "notifications_enabled": "boolean",
    "do_not_disturb_start": "string (HH:MM)",
    "do_not_disturb_end": "string (HH:MM)",
    "notification_types": {
        "delivery_reminder": "boolean",
        "payment_reminder": "boolean",
        "promotional": "boolean"
    },
    "language": "string (en, hi, etc)",
    "created_at": "timestamp",
    "updated_at": "timestamp"
}

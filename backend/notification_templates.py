"""
WhatsApp Message Templates
Pre-defined templates for all notification types
Each template supports Jinja2 variable substitution
"""

from datetime import datetime, timezone
import uuid
from database import db


# Template definitions
TEMPLATES = [
    {
        "name": "delivery_reminder",
        "type": "delivery_reminder",
        "channel": "whatsapp",
        "language": "en",
        "content": """Hi {{customer_name}}! 👋

Your EarlyBird delivery is scheduled for *{{delivery_date}}, 6-8 AM* in {{area}}.

Delivery boy: +91XXXXXXXXXX
Track: https://earlybird.in/track

Pause or modify? Reply here 👇""",
        "active": True,
        "category": "reminder"
    },
    {
        "name": "delivery_confirmed",
        "type": "delivery_confirmed",
        "channel": "whatsapp",
        "language": "en",
        "content": """✓ *Delivery Confirmed!*

Hi {{customer_name}}, thank you for choosing EarlyBird! 🎉

Delivery Date: *{{delivery_date}}*
Amount: Billed at month end

Questions? Reply here 👇""",
        "active": True,
        "category": "confirmation"
    },
    {
        "name": "payment_reminder",
        "type": "payment_reminder",
        "channel": "whatsapp",
        "language": "en",
        "content": """💳 *Payment Reminder*

Hi {{customer_name}},

Payment due: *₹{{amount}}* for {{period}}

Pay now: https://earlybird.in/pay

Terms: 7-day credit period
Questions? Contact us 👇""",
        "active": True,
        "category": "billing"
    },
    {
        "name": "payment_confirmation",
        "type": "payment_confirmation",
        "channel": "whatsapp",
        "language": "en",
        "content": """✓ *Payment Received!*

Hi {{customer_name}},

Payment of *₹{{amount}}* confirmed! 🎉

Receipt: https://earlybird.in/receipt
Your account is all set.

Thank you! 💚""",
        "active": True,
        "category": "billing"
    },
    {
        "name": "subscription_confirmation",
        "type": "subscription_confirmation",
        "channel": "whatsapp",
        "language": "en",
        "content": """✓ *Subscription Active!*

Hi {{customer_name}},

Your {{product}} subscription is active! 🚀

Starting: *{{start_date}}*
Pattern: As per your preference
Manage: https://earlybird.in/subscriptions

Pause anytime. Questions? Reply 👇""",
        "active": True,
        "category": "subscription"
    },
    {
        "name": "order_confirmation",
        "type": "order_confirmation",
        "channel": "whatsapp",
        "language": "en",
        "content": """✓ *Order Confirmed!*

Hi {{customer_name}},

Order #{{order_id}} confirmed ✓

Amount: *₹{{amount}}*
Delivery: *{{delivery_date}}, 6-8 AM*

Track: https://earlybird.in/orders/{{order_id}}

Questions? Reply 👇""",
        "active": True,
        "category": "order"
    },
    {
        "name": "pause_confirmation",
        "type": "pause_confirmation",
        "channel": "whatsapp",
        "language": "en",
        "content": """⏸️ *Subscription Paused*

Hi {{customer_name}},

Your subscription is paused until {{resume_date}}.

Resume anytime: https://earlybird.in/resume

Get back: Use code WELCOME20 for 20% off! 🎉

Questions? Reply 👇""",
        "active": True,
        "category": "subscription"
    },
    {
        "name": "churn_risk",
        "type": "churn_risk",
        "channel": "whatsapp",
        "language": "en",
        "content": """❤️ *We Miss You!*

Hi {{customer_name}},

We notice you've paused your subscription.

Limited time offer: *Resume now for 25% OFF* next order! 🎉

Resume: https://earlybird.in/resume

What can we improve? Your feedback matters! 👇""",
        "active": True,
        "category": "retention"
    },
    {
        "name": "new_product",
        "type": "new_product",
        "channel": "whatsapp",
        "language": "en",
        "content": """🆕 *New Product Alert!*

Hi {{customer_name}},

We just added {{product}} to your area! ✨

Available from: {{availability_date}}
Price: {{price}}
Add to subscription: https://earlybird.in/add/{{product_id}}

Feedback? Reply 👇""",
        "active": True,
        "category": "marketing"
    },
    {
        "name": "delivery_delayed",
        "type": "system_alert",
        "channel": "whatsapp",
        "language": "en",
        "content": """⏰ *Delivery Update*

Hi {{customer_name}},

Your delivery is slightly delayed today - ETA: {{eta_time}}

Delivery boy: {{delivery_boy_phone}}
Track: https://earlybird.in/track

Apologies for the wait! 👇""",
        "active": True,
        "category": "alert"
    }
]


async def initialize_templates():
    """
    Initialize notification templates in database
    Should be called on app startup
    """
    try:
        # Check if templates already exist
        count = await db.notification_templates.count_documents({})
        if count > 0:
            print(f"✓ Templates already initialized ({count} templates)")
            return

        # Insert templates
        for template in TEMPLATES:
            template["id"] = str(uuid.uuid4())
            template["created_at"] = datetime.now(timezone.utc).isoformat()
            template["updated_at"] = datetime.now(timezone.utc).isoformat()

        result = await db.notification_templates.insert_many(TEMPLATES)
        print(f"✓ Initialized {len(result.inserted_ids)} WhatsApp notification templates")

    except Exception as e:
        print(f"✗ Error initializing templates: {str(e)}")


async def get_all_templates(active_only: bool = False):
    """Get all notification templates"""
    query = {"active": True} if active_only else {}
    return await db.notification_templates.find(query, {"_id": 0}).to_list(None)


async def get_template_by_type(message_type: str):
    """Get template by message type"""
    return await db.notification_templates.find_one({
        "type": message_type,
        "active": True
    }, {"_id": 0})


async def update_template(template_type: str, new_content: str):
    """Update template content"""
    return await db.notification_templates.update_one(
        {"type": template_type},
        {
            "$set": {
                "content": new_content,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )


async def disable_template(template_type: str):
    """Disable a template"""
    return await db.notification_templates.update_one(
        {"type": template_type},
        {"$set": {"active": False}}
    )


async def enable_template(template_type: str):
    """Enable a template"""
    return await db.notification_templates.update_one(
        {"type": template_type},
        {"$set": {"active": True}}
    )


# Template content reference (for documentation)
TEMPLATE_GUIDE = """
# WhatsApp Notification Templates

## Available Variables (by template type)

### delivery_reminder
- {{customer_name}}: Customer's first name
- {{delivery_date}}: Date of delivery (e.g., "Jan 28")
- {{area}}: Delivery area (e.g., "Bandra")

### delivery_confirmed
- {{customer_name}}: Customer's first name
- {{delivery_date}}: Delivery date

### payment_reminder
- {{customer_name}}: Customer's first name
- {{amount}}: Amount due (e.g., "₹2,500")
- {{period}}: Billing period (e.g., "January")

### payment_confirmation
- {{customer_name}}: Customer's first name
- {{amount}}: Amount paid (e.g., "₹2,500")

### subscription_confirmation
- {{customer_name}}: Customer's first name
- {{product}}: Product name (e.g., "Daily Milk")
- {{start_date}}: Start date

### order_confirmation
- {{customer_name}}: Customer's first name
- {{order_id}}: Order number
- {{amount}}: Order total
- {{delivery_date}}: Delivery date

### pause_confirmation
- {{customer_name}}: Customer's first name
- {{resume_date}}: Date when subscription resumes

### churn_risk
- {{customer_name}}: Customer's first name

### new_product
- {{customer_name}}: Customer's first name
- {{product}}: Product name
- {{availability_date}}: When available
- {{price}}: Product price
- {{product_id}}: Product ID for adding to subscription

### delivery_delayed (system_alert)
- {{customer_name}}: Customer's first name
- {{eta_time}}: Estimated time of arrival
- {{delivery_boy_phone}}: Delivery boy's phone number

## Formatting Options

- *Text* → Bold text
- _Text_ → Italic text
- ~Text~ → Strikethrough
- ```Text``` → Code/monospace
- Emoji supported: 🎉 ✓ ⏸️ etc.

## Guidelines

1. Keep messages under 160 characters when possible
2. Include one call-to-action (CTA) per message
3. Use emoji for quick visual scan
4. Always include customer name
5. Add footer for support/questions
"""

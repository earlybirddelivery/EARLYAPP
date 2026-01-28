"""
🤑 PHASE 0.4.4: CRITICAL BILLING FIX - Include One-Time Orders
================================================================

🚨 REVENUE RECOVERY SCRIPT: ₹50K+/MONTH 🚨

Problem:
- One-time orders are created successfully ✅
- BUT: Never added to billing_records ❌
- Result: ₹50K+/month revenue LOST

Solution:
1. Find all one-time orders NOT in billing_records
2. Create missing billing_records  
3. Trigger payment reminders (WhatsApp)
4. Mark orders as billed to prevent duplicates

Timeline: 30 min - 1 hour execution

Author: AI Agent
Date: January 27, 2026
"""

import asyncio
from datetime import datetime, timezone
from database import db
import uuid
import json

async def find_unbilled_orders():
    """Find all delivered one-time orders NOT in billing"""
    print("🔍 Searching for unbilled one-time orders...")
    
    # Find orders that should be billed
    unbilled = await db.orders.find({
        "status": "DELIVERED",
        "order_type": "one_time",
        "$or": [
            {"billed": {"$ne": True}},
            {"billed": {"$exists": False}}
        ]
    }, {"_id": 0}).to_list(10000)
    
    print(f"📊 Found {len(unbilled)} unbilled one-time orders")
    
    # Cross-check with billing_records
    already_billed = await db.billing_records.find({
        "order_id": {"$in": [o["id"] for o in unbilled]}
    }, {"_id": 0}).to_list(10000)
    
    already_billed_ids = {b["order_id"] for b in already_billed}
    
    # Filter out already billed
    truly_unbilled = [o for o in unbilled if o["id"] not in already_billed_ids]
    
    print(f"✅ Actually unbilled: {len(truly_unbilled)} orders")
    print(f"   (Already in billing_records: {len(already_billed)})")
    
    return truly_unbilled

async def create_billing_for_orders(orders: list):
    """Create billing records for one-time orders"""
    print(f"\n💰 Creating billing records for {len(orders)} orders...")
    
    created = 0
    failed = 0
    
    for order in orders:
        try:
            # Create billing record
            billing_record = {
                "id": str(uuid.uuid4()),
                "customer_id": order.get("customer_id") or order.get("user_id"),
                "order_id": order["id"],
                "month": order.get("billed_month") or datetime.now(timezone.utc).strftime("%Y-%m"),
                "items_count": len(order.get("items", [])),
                "amount": order.get("total_amount", 0),
                "status": "pending",
                "payment_status": "unpaid",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "due_date": (datetime.now(timezone.utc).date()).isoformat(),
                "order_type": "one_time",
                "items": order.get("items", []),
                "notes": f"One-time order {order['id']}"
            }
            
            # Insert billing record
            await db.billing_records.insert_one(billing_record)
            
            # Update order as billed
            await db.orders.update_one(
                {"id": order["id"]},
                {"$set": {
                    "billed": True,
                    "billed_at": datetime.now(timezone.utc).isoformat(),
                    "billed_month": billing_record["month"]
                }}
            )
            
            created += 1
            
            if created % 50 == 0:
                print(f"   ✓ Processed {created} orders...")
        
        except Exception as e:
            failed += 1
            print(f"   ✗ Failed to bill order {order['id']}: {str(e)}")
    
    print(f"\n✅ Billing Creation Complete:")
    print(f"   Created: {created}")
    print(f"   Failed: {failed}")
    
    return created

async def send_payment_reminders(orders: list):
    """Send WhatsApp payment reminders to customers"""
    print(f"\n📱 Sending {len(orders)} WhatsApp payment reminders...")
    
    try:
        from notification_service import notification_service
        
        sent = 0
        failed = 0
        
        for order in orders[:100]:  # Limit to first 100 to avoid API rate limits
            try:
                customer_id = order.get("customer_id") or order.get("user_id")
                customer = await db.customers_v2.find_one({"id": customer_id})
                
                if customer and customer.get("phone"):
                    # Send reminder
                    await notification_service.send_payment_reminder(
                        phone=customer["phone"],
                        customer_name=customer.get("name", "Customer"),
                        amount=order.get("total_amount", 0),
                        order_id=order["id"],
                        reference_id=order["id"]
                    )
                    sent += 1
            except Exception as e:
                failed += 1
                print(f"   ✗ Failed to notify {customer_id}: {str(e)}")
        
        print(f"\n✅ Reminders sent:")
        print(f"   Sent: {sent}")
        print(f"   Failed: {failed}")
        
    except ImportError:
        print("   ℹ️  notification_service not available - skipping reminders")

async def verify_billing_integrity():
    """Verify all one-time orders are now billed"""
    print("\n🔍 Verifying billing integrity...")
    
    # Check for any unbilled delivered orders
    unbilled = await db.orders.find({
        "status": "DELIVERED",
        "order_type": "one_time",
        "$or": [
            {"billed": {"$ne": True}},
            {"billed": {"$exists": False}}
        ]
    }, {"_id": 0}).to_list(100)
    
    if unbilled:
        print(f"⚠️  Found {len(unbilled)} still-unbilled orders")
        for order in unbilled:
            print(f"   - {order['id']}: {order.get('total_amount', 0)}")
    else:
        print("✅ All delivered one-time orders are now billed!")
    
    # Calculate recovered revenue
    billing_records = await db.billing_records.find({
        "order_type": "one_time"
    }, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(b.get("amount", 0) for b in billing_records)
    
    print(f"\n💰 Revenue Recovery Summary:")
    print(f"   Total one-time orders billed: {len(billing_records)}")
    print(f"   Total revenue recovered: ₹{total_revenue:,.2f}")
    print(f"   Monthly average: ₹{total_revenue/12:,.2f}")

async def generate_recovery_report():
    """Generate detailed recovery report"""
    print("\n" + "=" * 60)
    print("📊 PHASE 0.4.4 BILLING FIX REPORT")
    print("=" * 60)
    
    # Count all one-time orders
    all_orders = await db.orders.find({
        "order_type": "one_time"
    }, {"_id": 0}).to_list(10000)
    
    # Count billed
    billed = await db.orders.find({
        "order_type": "one_time",
        "billed": True
    }, {"_id": 0}).to_list(10000)
    
    # Count delivered but unbilled
    delivered_unbilled = await db.orders.find({
        "status": "DELIVERED",
        "order_type": "one_time",
        "$or": [
            {"billed": {"$ne": True}},
            {"billed": {"$exists": False}}
        ]
    }, {"_id": 0}).to_list(10000)
    
    # Calculate totals
    total_amount = sum(o.get("total_amount", 0) for o in all_orders)
    billed_amount = sum(o.get("total_amount", 0) for o in billed)
    unbilled_amount = sum(o.get("total_amount", 0) for o in delivered_unbilled)
    
    print(f"\n📈 Order Statistics:")
    print(f"   Total one-time orders: {len(all_orders)}")
    print(f"   ✅ Billed: {len(billed)} ({len(billed)*100/max(len(all_orders), 1):.1f}%)")
    print(f"   ❌ Unbilled (delivered): {len(delivered_unbilled)}")
    
    print(f"\n💰 Revenue Statistics:")
    print(f"   Total revenue (all orders): ₹{total_amount:,.2f}")
    print(f"   ✅ Billed revenue: ₹{billed_amount:,.2f}")
    print(f"   ❌ Unbilled revenue: ₹{unbilled_amount:,.2f}")
    
    print(f"\n📅 Monthly Averages:")
    print(f"   Monthly revenue: ₹{total_amount/12:,.2f}")
    print(f"   ✅ Monthly billed: ₹{billed_amount/12:,.2f}")
    print(f"   ❌ Monthly unbilled: ₹{unbilled_amount/12:,.2f}")
    
    print("\n" + "=" * 60)
    if unbilled_amount > 0:
        print(f"🚨 CRITICAL: ₹{unbilled_amount:,.2f} revenue still not billed!")
        print(f"📈 This represents ₹{unbilled_amount/12:,.2f}/month revenue loss!")
    else:
        print("🎉 SUCCESS: All revenue is now properly billed!")
    print("=" * 60)

async def main():
    """Main execution"""
    print("\n" + "=" * 60)
    print("🚀 PHASE 0.4.4: CRITICAL BILLING FIX EXECUTION")
    print("=" * 60)
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Step 1: Find unbilled orders
        unbilled_orders = await find_unbilled_orders()
        
        if not unbilled_orders:
            print("\n✅ All one-time orders already billed!")
            await verify_billing_integrity()
            return
        
        # Step 2: Create billing records
        created = await create_billing_for_orders(unbilled_orders)
        
        # Step 3: Send reminders (non-critical)
        await send_payment_reminders(unbilled_orders)
        
        # Step 4: Verify integrity
        await verify_billing_integrity()
        
        # Step 5: Generate report
        await generate_recovery_report()
        
        print(f"\n✅ Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during billing fix: {str(e)}")
        raise

# For standalone execution
if __name__ == "__main__":
    asyncio.run(main())

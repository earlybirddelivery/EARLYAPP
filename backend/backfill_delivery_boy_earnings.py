# Phase 1.5: Backfill Delivery Boy Earnings
# Initializes earnings fields for existing delivery boys and calculates historical earnings

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DeliveryBoyEarningsBackfill:
    """
    Backfill script to initialize earnings fields for existing delivery boys.
    
    Workflow:
    1. Find all delivery boys in the database
    2. For each delivery boy:
       - Initialize earnings fields if missing
       - Calculate historical earnings from delivery_statuses
       - Calculate delivery counts
       - Set status to active
    3. Create indexes for performance queries
    4. Generate completion report
    """
    
    def __init__(self, db):
        self.db = db
        self.logger = logger
    
    async def backfill_all(self) -> Dict[str, Any]:
        """
        Run full backfill for all delivery boys.
        
        Returns:
        {
            "status": "success",
            "total_delivery_boys": 50,
            "initialized": 50,
            "failed": 0,
            "earnings_calculated": 625000,
            "total_deliveries_counted": 12500,
            "duration_seconds": 45.3
        }
        """
        start_time = datetime.now()
        
        try:
            self.logger.info("[BACKFILL] Starting delivery boy earnings backfill...")
            
            # Get all delivery boys
            delivery_boys = await self.db.delivery_boys.find({}).to_list(None)
            total_count = len(delivery_boys)
            
            self.logger.info(f"[BACKFILL] Found {total_count} delivery boys")
            
            initialized_count = 0
            failed_count = 0
            total_earnings = 0
            total_deliveries = 0
            
            # Process each delivery boy
            for idx, boy in enumerate(delivery_boys, 1):
                try:
                    # Initialize or update earnings fields
                    success, earnings, deliveries = await self._initialize_boy_earnings(
                        boy.get("id"),
                        boy
                    )
                    
                    if success:
                        initialized_count += 1
                        total_earnings += earnings
                        total_deliveries += deliveries
                        
                        # Log progress
                        if idx % 10 == 0:
                            self.logger.info(
                                f"[BACKFILL] Progress: {idx}/{total_count} "
                                f"(Total earnings: ₹{total_earnings:,.0f}, "
                                f"Deliveries: {total_deliveries})"
                            )
                    else:
                        failed_count += 1
                
                except Exception as e:
                    self.logger.error(f"Error processing {boy.get('id')}: {str(e)}")
                    failed_count += 1
            
            # Create indexes
            await self._create_indexes()
            
            duration = (datetime.now() - start_time).total_seconds()
            
            result = {
                "status": "success",
                "total_delivery_boys": total_count,
                "initialized": initialized_count,
                "failed": failed_count,
                "earnings_calculated": total_earnings,
                "total_deliveries_counted": total_deliveries,
                "avg_earnings_per_boy": round(total_earnings / initialized_count, 2) if initialized_count > 0 else 0,
                "duration_seconds": round(duration, 2)
            }
            
            self.logger.info(f"[BACKFILL] Completed: {result}")
            return result
            
        except Exception as e:
            self.logger.error(f"Backfill failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def _initialize_boy_earnings(
        self,
        delivery_boy_id: str,
        boy_data: Dict[str, Any]
    ) -> tuple[bool, float, int]:
        """
        Initialize earnings for a single delivery boy.
        
        Returns: (success, total_earnings, total_deliveries)
        """
        try:
            # Check if earnings already initialized
            existing = await self.db.delivery_boys.find_one(
                {"id": delivery_boy_id},
                {"_id": 0, "total_earnings": 1}
            )
            
            if existing and existing.get("total_earnings") is not None:
                # Already initialized, just get the values
                total_earnings = existing.get("total_earnings", 0)
                total_deliveries = existing.get("total_deliveries", 0)
                return (True, total_earnings, total_deliveries)
            
            # Calculate earnings from delivery_statuses
            earnings_data = await self._calculate_earnings(delivery_boy_id)
            
            # Initialize earnings fields
            earnings_fields = {
                "total_deliveries": earnings_data["total_deliveries"],
                "today_deliveries": earnings_data.get("today_deliveries", 0),
                "week_deliveries": earnings_data.get("week_deliveries", 0),
                "month_deliveries": earnings_data.get("month_deliveries", 0),
                
                "total_earnings": earnings_data["total_earnings"],
                "today_earnings": earnings_data.get("today_earnings", 0),
                "week_earnings": earnings_data.get("week_earnings", 0),
                "month_earnings": earnings_data.get("month_earnings", 0),
                
                "last_payment_date": None,
                "last_payment_amount": 0,
                "payment_frequency": "weekly",
                "status": "active",
                
                "earnings_history": earnings_data.get("earnings_history", []),
                "backfilled_at": datetime.now()
            }
            
            # Update delivery boy with earnings
            result = await self.db.delivery_boys.update_one(
                {"id": delivery_boy_id},
                {"$set": earnings_fields}
            )
            
            if result.modified_count > 0 or result.upserted_id:
                self.logger.debug(
                    f"Initialized {delivery_boy_id}: "
                    f"₹{earnings_data['total_earnings']:,.0f} earnings, "
                    f"{earnings_data['total_deliveries']} deliveries"
                )
                
                return (
                    True,
                    earnings_data["total_earnings"],
                    earnings_data["total_deliveries"]
                )
            
            return (False, 0, 0)
            
        except Exception as e:
            self.logger.error(f"Error initializing {delivery_boy_id}: {str(e)}")
            return (False, 0, 0)
    
    async def _calculate_earnings(self, delivery_boy_id: str) -> Dict[str, Any]:
        """
        Calculate historical earnings from delivery records.
        
        Returns:
        {
            "total_deliveries": 1250,
            "total_earnings": 62500,
            "today_deliveries": 15,
            "today_earnings": 750,
            "week_deliveries": 65,
            "week_earnings": 3250,
            "month_deliveries": 250,
            "month_earnings": 12500,
            "earnings_history": [...]
        }
        """
        try:
            now = datetime.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_start = now - timedelta(days=now.weekday())
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Find all delivered orders for this delivery boy
            orders = await self.db.orders.find({
                "assigned_to": delivery_boy_id,
                "status": "delivered"
            }).to_list(None)
            
            # Also check delivery_statuses collection
            deliveries = await self.db.delivery_statuses.find({
                "delivery_boy_id": delivery_boy_id,
                "status": "delivered"
            }).to_list(None)
            
            # Combine and deduplicate
            all_records = []
            seen_ids = set()
            
            for order in orders:
                order_id = order.get("id")
                if order_id not in seen_ids:
                    all_records.append({
                        "id": order_id,
                        "timestamp": order.get("delivery_status", {}).get("delivered_at") or order.get("updated_at"),
                        "amount": 50  # Default commission per delivery
                    })
                    seen_ids.add(order_id)
            
            for delivery in deliveries:
                order_id = delivery.get("order_id")
                if order_id not in seen_ids:
                    all_records.append({
                        "id": order_id,
                        "timestamp": delivery.get("delivered_at") or delivery.get("completed_at"),
                        "amount": 50  # Default commission per delivery
                    })
                    seen_ids.add(order_id)
            
            # Calculate totals
            total_deliveries = len(all_records)
            total_earnings = total_deliveries * 50  # ₹50 per delivery
            
            # Calculate by period
            today_records = [r for r in all_records if self._parse_timestamp(r.get("timestamp")) >= today_start]
            week_records = [r for r in all_records if self._parse_timestamp(r.get("timestamp")) >= week_start]
            month_records = [r for r in all_records if self._parse_timestamp(r.get("timestamp")) >= month_start]
            
            today_deliveries = len(today_records)
            week_deliveries = len(week_records)
            month_deliveries = len(month_records)
            
            today_earnings = today_deliveries * 50
            week_earnings = week_deliveries * 50
            month_earnings = month_deliveries * 50
            
            # Build earnings history
            earnings_history = [
                {
                    "timestamp": record.get("timestamp"),
                    "order_id": record.get("id"),
                    "amount": record.get("amount"),
                    "type": "delivery"
                }
                for record in sorted(all_records, key=lambda x: x.get("timestamp", ""), reverse=True)
            ]
            
            return {
                "total_deliveries": total_deliveries,
                "total_earnings": total_earnings,
                "today_deliveries": today_deliveries,
                "today_earnings": today_earnings,
                "week_deliveries": week_deliveries,
                "week_earnings": week_earnings,
                "month_deliveries": month_deliveries,
                "month_earnings": month_earnings,
                "earnings_history": earnings_history
            }
            
        except Exception as e:
            self.logger.error(f"Error calculating earnings for {delivery_boy_id}: {str(e)}")
            return {
                "total_deliveries": 0,
                "total_earnings": 0,
                "today_deliveries": 0,
                "today_earnings": 0,
                "week_deliveries": 0,
                "week_earnings": 0,
                "month_deliveries": 0,
                "month_earnings": 0,
                "earnings_history": []
            }
    
    def _parse_timestamp(self, ts: Any) -> datetime:
        """Parse timestamp to datetime"""
        if isinstance(ts, datetime):
            return ts
        elif isinstance(ts, str):
            try:
                return datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except:
                return datetime.now() - timedelta(days=365)  # Default to old date
        else:
            return datetime.now() - timedelta(days=365)
    
    async def _create_indexes(self) -> None:
        """Create indexes for performance queries"""
        try:
            # Indexes for delivery_boys collection
            indexes = [
                [("status", 1)],
                [("total_deliveries", -1)],
                [("total_earnings", -1)],
                [("week_deliveries", -1)],
                [("created_at", -1)],
                [("user_id", 1)]
            ]
            
            for index_spec in indexes:
                try:
                    await self.db.delivery_boys.create_index(index_spec)
                    self.logger.debug(f"Created index: {index_spec}")
                except Exception as e:
                    if "already exists" not in str(e):
                        self.logger.warning(f"Index creation warning: {str(e)}")
            
            self.logger.info("[BACKFILL] Indexes created successfully")
            
        except Exception as e:
            self.logger.error(f"Error creating indexes: {str(e)}")


# Async wrapper for synchronous execution
async def run_backfill(db):
    """Run backfill process"""
    backfiller = DeliveryBoyEarningsBackfill(db)
    return await backfiller.backfill_all()


# Synchronous entry point (for script execution)
def backfill_delivery_boys(db):
    """
    Entry point for backfill.
    
    Usage in your application:
    ```python
    from backfill_delivery_boy_earnings import backfill_delivery_boys
    from database import get_db
    
    db = get_db()
    result = backfill_delivery_boys(db)
    print(result)
    ```
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(run_backfill(db))


# Direct script execution
if __name__ == "__main__":
    print("[BACKFILL] Delivery Boy Earnings Backfill Script")
    print("[BACKFILL] Connecting to database...")
    
    try:
        from database import get_db
        db = get_db()
        
        print("[BACKFILL] Running backfill process...")
        result = backfill_delivery_boys(db)
        
        print("\n[BACKFILL] === RESULTS ===")
        print(f"Status: {result.get('status')}")
        print(f"Total Delivery Boys: {result.get('total_delivery_boys')}")
        print(f"Initialized: {result.get('initialized')}")
        print(f"Failed: {result.get('failed')}")
        print(f"Total Earnings Calculated: ₹{result.get('earnings_calculated'):,.0f}")
        print(f"Total Deliveries Counted: {result.get('total_deliveries_counted'):,}")
        print(f"Average Earnings per Boy: ₹{result.get('avg_earnings_per_boy'):,.2f}")
        print(f"Duration: {result.get('duration_seconds')} seconds")
        print("[BACKFILL] === COMPLETE ===\n")
        
    except Exception as e:
        print(f"[BACKFILL ERROR] {str(e)}")
        import traceback
        traceback.print_exc()

"""
MIGRATION 002: Add order_id foreign key to db.delivery_statuses

PURPOSE:
--------
Link delivery confirmations to orders to establish the connection between:
  - When a delivery is marked complete (db.delivery_statuses)
  - Which order was delivered (db.orders)

This is STEP 20 of the Phase 4 Critical Linkage Fixes.

WHAT THIS FIXES:
---------------
Currently: delivery_statuses records only contain customer_id and delivery_date
Problem: Cannot determine which ORDER was delivered
Solution: Add order_id foreign key field (optional for migration, will be required in application)

MIGRATION DETAILS:
-----------------
Direction: UP (Add field to existing records)
  - Add order_id field to ALL existing delivery_statuses records (set to null)
  - Create index on order_id for fast queries
  - Create compound index on (customer_id, order_id, delivery_date) for complex queries

Direction: DOWN (Rollback)
  - Remove order_id field from ALL delivery_statuses records
  - Drop order_id index
  - Drop compound index

DATA CONSISTENCY:
-----------------
Before Migration:
  db.delivery_statuses = {
    id: "uuid-001",
    customer_id: "cust-123",
    delivery_date: "2026-01-27",
    status: "delivered"
  }

After Migration:
  db.delivery_statuses = {
    id: "uuid-001",
    order_id: null,  ← NEW (will be populated by application code)
    customer_id: "cust-123",
    delivery_date: "2026-01-27",
    status: "delivered"
  }

ROLLBACK SAFETY:
---------------
✅ Backward compatible: null values don't break existing queries
✅ No data loss: order_id is initially null (safe to revert)
✅ Queries continue working: existing find({customer_id: X}) still works
✅ No schema conflicts: field addition is non-breaking

INDEXING STRATEGY:
-----------------
Single field index:
  db.delivery_statuses.create_index("order_id")
  - Purpose: Fast lookup by order_id when processing order deliveries
  - Benefit: O(log n) lookup instead of O(n) collection scan

Compound index:
  db.delivery_statuses.create_index([("customer_id", 1), ("order_id", 1), ("delivery_date", -1)])
  - Purpose: Fast multi-field queries for reporting
  - Benefit: Common query pattern in billing and reporting

EXECUTION TIME:
---------------
Estimate for typical production data (~50K records):
  - Add field to all records: 2-5 seconds
  - Create indexes: 5-10 seconds
  - Total: ~10-15 seconds (acceptable for off-peak window)

POST-MIGRATION VALIDATION:
--------------------------
After running this migration, validate:
  1. Count records WITH order_id: should be 0 (all null)
  2. Count records WITHOUT order_id: should be 0 (all have field)
  3. Index created: db.delivery_statuses.find({order_id: null}) uses index
  4. No errors in application logs

NEXT STEPS AFTER THIS MIGRATION:
--------------------------------
1. Deploy routes_delivery_boy.py changes to require order_id
2. Deploy routes_shared_links.py changes to require order_id
3. Application code will now populate order_id when creating new delivery_statuses
4. For existing records: admin can run backfill script to link orders
5. Continue with STEP 21 (User ↔ Customer linking)

RELATED STEPS:
--------------
Prerequisite: STEP 19 (add subscription_id to db.orders) ← Must run first
Dependent: STEP 22 (link delivery confirmation to order status updates)
           STEP 23 (include one-time orders in billing)
           STEP 25 (add audit trail for deliveries)
           STEP 26 (validate delivery quantities)

REFERENCES:
-----------
- AI_AGENT_EXECUTION_PROMPTS.md - STEP 20
- LINKAGE_FIX_001.md - Previous migration documentation
- Database model changes: models_phase0_updated.py (DeliveryStatus class)
- Route changes: routes_delivery_boy.py, routes_shared_links.py
"""

from migrations import Migration


class AddOrderIdToDeliveryStatuses(Migration):
    def __init__(self):
        super().__init__(version=2, name="Add order_id to db.delivery_statuses")

    async def up(self, db):
        """
        Apply migration: Add order_id field to all delivery_statuses records
        """
        print(f"Applying migration {self.version}: {self.name}")

        try:
            # Step 1: Add order_id field to all existing records
            print("  → Adding order_id field to all records...")
            result = await db.delivery_statuses.update_many(
                {},  # Filter: all records
                {
                    "$set": {
                        "order_id": None  # Set to null initially
                    }
                }
            )
            print(f"    ✅ Updated {result.modified_count} records")

            # Step 2: Create single-field index on order_id
            print("  → Creating index on order_id...")
            await db.delivery_statuses.create_index("order_id")
            print("    ✅ Index created")

            # Step 3: Create compound index for complex queries
            print("  → Creating compound index on (customer_id, order_id, delivery_date)...")
            await db.delivery_statuses.create_index([
                ("customer_id", 1),
                ("order_id", 1),
                ("delivery_date", -1)
            ])
            print("    ✅ Compound index created")

            # Step 4: Verify migration
            print("  → Verifying migration...")
            count_with_field = await db.delivery_statuses.count_documents({
                "order_id": {"$exists": True}
            })
            count_without_field = await db.delivery_statuses.count_documents({
                "order_id": {"$exists": False}
            })
            print(f"    ✅ Records with order_id: {count_with_field}")
            print(f"    ✅ Records without order_id: {count_without_field}")

            if count_without_field > 0:
                print(f"    ⚠️  WARNING: {count_without_field} records missing order_id field!")
                return False

            print(f"✅ Migration {self.version} applied successfully!")
            return True

        except Exception as e:
            print(f"❌ Migration {self.version} failed: {str(e)}")
            raise

    async def down(self, db):
        """
        Rollback migration: Remove order_id field from all delivery_statuses records
        """
        print(f"Rolling back migration {self.version}: {self.name}")

        try:
            # Step 1: Drop compound index
            print("  → Dropping compound index...")
            try:
                await db.delivery_statuses.drop_index([
                    ("customer_id", 1),
                    ("order_id", 1),
                    ("delivery_date", -1)
                ])
                print("    ✅ Compound index dropped")
            except Exception as e:
                print(f"    ⚠️  Compound index not found (may have been deleted): {str(e)}")

            # Step 2: Drop single-field index
            print("  → Dropping index on order_id...")
            try:
                await db.delivery_statuses.drop_index("order_id")
                print("    ✅ Index dropped")
            except Exception as e:
                print(f"    ⚠️  Index not found (may have been deleted): {str(e)}")

            # Step 3: Remove order_id field from all records
            print("  → Removing order_id field from all records...")
            result = await db.delivery_statuses.update_many(
                {},  # Filter: all records
                {
                    "$unset": {
                        "order_id": ""  # Remove the field
                    }
                }
            )
            print(f"    ✅ Removed from {result.modified_count} records")

            # Step 4: Verify rollback
            print("  → Verifying rollback...")
            count_with_field = await db.delivery_statuses.count_documents({
                "order_id": {"$exists": True}
            })
            print(f"    ✅ Records still with order_id: {count_with_field}")

            if count_with_field > 0:
                print(f"    ⚠️  WARNING: {count_with_field} records still have order_id field!")
                return False

            print(f"✅ Migration {self.version} rolled back successfully!")
            return True

        except Exception as e:
            print(f"❌ Rollback of migration {self.version} failed: {str(e)}")
            raise

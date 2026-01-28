# Phase 1.6: Backfill Supplier Consolidation Data
# One-time initialization script for supplier consolidation system

import asyncio
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SupplierConsolidationBackfill:
    """
    Initialize supplier consolidation system for existing suppliers.
    
    Handles:
    - Adding consolidation fields to existing suppliers
    - Creating consolidation audit collection
    - Linking suppliers to users where possible
    - Initial duplicate detection
    - Quality metrics setup
    """
    
    def __init__(self, db):
        self.db = db
    
    async def initialize_consolidation_fields(self) -> dict:
        """
        Add consolidation-related fields to existing suppliers.
        """
        try:
            logger.info("Initializing consolidation fields for suppliers...")
            
            # Get all suppliers
            suppliers = await self.db.suppliers.find({}).to_list(None)
            logger.info(f"Found {len(suppliers)} suppliers")
            
            # Update all suppliers with consolidation fields
            result = await self.db.suppliers.update_many(
                {},  # All documents
                {
                    "$set": {
                        "is_consolidated": False,
                        "consolidated_into": None,
                        "consolidated_at": None,
                        "alternate_emails": [],
                        "alternate_phones": [],
                        "consolidation_source_count": 1
                    }
                }
            )
            
            logger.info(f"Updated {result.modified_count} suppliers with consolidation fields")
            
            return {
                "status": "success",
                "suppliers_updated": result.modified_count,
                "operation": "consolidation_fields_added"
            }
        
        except Exception as e:
            logger.error(f"Error initializing consolidation fields: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def create_audit_collection(self) -> dict:
        """
        Create and initialize the supplier consolidation audit collection.
        """
        try:
            logger.info("Creating supplier consolidation audit collection...")
            
            # Check if collection exists
            collections = await self.db.list_collection_names()
            
            if "supplier_consolidation_audit" not in collections:
                # Create collection with indexes
                await self.db.create_collection("supplier_consolidation_audit")
                logger.info("Created supplier_consolidation_audit collection")
            else:
                logger.info("supplier_consolidation_audit collection already exists")
            
            # Create indexes for efficient querying
            audit_collection = self.db.supplier_consolidation_audit
            
            # Index on master_id
            await audit_collection.create_index("master_id")
            logger.info("Created index on master_id")
            
            # Index on consolidated_ids
            await audit_collection.create_index("consolidated_ids")
            logger.info("Created index on consolidated_ids")
            
            # Index on timestamp for time-based queries
            await audit_collection.create_index("timestamp")
            logger.info("Created index on timestamp")
            
            # Compound index for efficient searches
            await audit_collection.create_index([("master_id", 1), ("timestamp", -1)])
            logger.info("Created compound index on master_id and timestamp")
            
            return {
                "status": "success",
                "collection_created": True,
                "indexes_created": 4
            }
        
        except Exception as e:
            logger.error(f"Error creating audit collection: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def link_suppliers_to_users(self) -> dict:
        """
        Link suppliers to user accounts where possible.
        
        Matches suppliers to users by email.
        """
        try:
            logger.info("Linking suppliers to user accounts...")
            
            suppliers = await self.db.suppliers.find({}).to_list(None)
            users = await self.db.users.find(
                {"role": "supplier"},
                {"_id": 0, "id": 1, "email": 1}
            ).to_list(None)
            
            # Build email to user_id mapping
            email_to_user = {user.get("email"): user.get("id") for user in users}
            
            linked_count = 0
            unlinked_count = 0
            
            for supplier in suppliers:
                supplier_email = supplier.get("email", "").lower()
                
                if supplier_email in email_to_user:
                    # Link to user
                    await self.db.suppliers.update_one(
                        {"id": supplier.get("id")},
                        {
                            "$set": {
                                "user_id": email_to_user[supplier_email],
                                "updated_at": datetime.now()
                            }
                        }
                    )
                    linked_count += 1
                    logger.info(f"Linked supplier {supplier.get('name')} to user {email_to_user[supplier_email]}")
                else:
                    unlinked_count += 1
            
            logger.info(f"Linked {linked_count} suppliers, {unlinked_count} remain unlinked")
            
            return {
                "status": "success",
                "suppliers_linked": linked_count,
                "suppliers_unlinked": unlinked_count,
                "total_suppliers": len(suppliers)
            }
        
        except Exception as e:
            logger.error(f"Error linking suppliers to users: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def detect_initial_duplicates(self) -> dict:
        """
        Run initial duplicate detection and log findings.
        """
        try:
            logger.info("Running initial duplicate detection...")
            
            from backend.supplier_consolidation import SupplierConsolidationEngine
            
            engine = SupplierConsolidationEngine(self.db)
            duplicates = await engine.find_duplicate_suppliers()
            
            logger.info(f"Found {len(duplicates)} potential duplicate sets")
            
            # Log duplicates for review
            for duplicate_set in duplicates:
                logger.info(f"Duplicates: {duplicate_set}")
            
            # Create summary
            total_duplicate_suppliers = sum(
                len(d.get("duplicates", []))
                for d in duplicates
            )
            
            return {
                "status": "success",
                "duplicate_sets_found": len(duplicates),
                "total_duplicate_suppliers": total_duplicate_suppliers,
                "duplicates": duplicates[:10]  # Return first 10 for review
            }
        
        except Exception as e:
            logger.error(f"Error detecting duplicates: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def create_initial_quality_baseline(self) -> dict:
        """
        Create initial quality baseline and data quality report.
        """
        try:
            logger.info("Creating initial quality baseline...")
            
            from backend.supplier_consolidation import SupplierConsolidationEngine
            
            engine = SupplierConsolidationEngine(self.db)
            quality_metrics = await engine.get_supplier_quality_metrics()
            
            logger.info(f"Quality baseline created")
            
            # Log metrics
            logger.info(f"Data quality metrics: {quality_metrics}")
            
            return {
                "status": "success",
                "quality_baseline_created": True,
                "metrics": quality_metrics
            }
        
        except Exception as e:
            logger.error(f"Error creating quality baseline: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def run_full_initialization(self) -> dict:
        """
        Run complete initialization process.
        """
        logger.info("=" * 60)
        logger.info("SUPPLIER CONSOLIDATION SYSTEM BACKFILL STARTING")
        logger.info("=" * 60)
        
        results = {}
        
        # Step 1: Create audit collection
        logger.info("\nStep 1: Creating audit collection...")
        results["audit_collection"] = await self.create_audit_collection()
        
        # Step 2: Initialize consolidation fields
        logger.info("\nStep 2: Initializing consolidation fields...")
        results["consolidation_fields"] = await self.initialize_consolidation_fields()
        
        # Step 3: Link suppliers to users
        logger.info("\nStep 3: Linking suppliers to users...")
        results["user_linkage"] = await self.link_suppliers_to_users()
        
        # Step 4: Detect initial duplicates
        logger.info("\nStep 4: Detecting initial duplicates...")
        results["duplicate_detection"] = await self.detect_initial_duplicates()
        
        # Step 5: Create quality baseline
        logger.info("\nStep 5: Creating quality baseline...")
        results["quality_baseline"] = await self.create_initial_quality_baseline()
        
        # Store backfill completion record
        try:
            await self.db.supplier_consolidation_backfill.insert_one({
                "timestamp": datetime.now(),
                "status": "completed",
                "results": results
            })
            logger.info("\nBackfill completion record stored")
        except Exception as e:
            logger.warning(f"Could not store backfill record: {str(e)}")
        
        logger.info("\n" + "=" * 60)
        logger.info("SUPPLIER CONSOLIDATION SYSTEM BACKFILL COMPLETED")
        logger.info("=" * 60)
        
        return {
            "status": "completed",
            "initialization_steps": results,
            "timestamp": datetime.now().isoformat()
        }


async def run_backfill(db):
    """
    Run the backfill initialization.
    """
    backfill = SupplierConsolidationBackfill(db)
    return await backfill.run_full_initialization()


# Script execution
if __name__ == "__main__":
    import sys
    sys.path.insert(0, '/path/to/backend')
    
    from backend.database import Database
    
    async def main():
        db = Database()
        await db.connect()
        
        try:
            result = await run_backfill(db.db)
            logger.info(f"Backfill result: {result}")
        finally:
            await db.disconnect()
    
    asyncio.run(main())


# Export
__all__ = ["SupplierConsolidationBackfill", "run_backfill"]

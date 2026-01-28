# Phase 1.6: Supplier System - Consolidation Engine
# Identifies and consolidates duplicate suppliers, improves data quality

import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from enum import Enum
import logging
import difflib

logger = logging.getLogger(__name__)


class SupplierMatchConfidence(str, Enum):
    """Confidence level for supplier matching"""
    HIGH = "high"      # > 90% match
    MEDIUM = "medium"  # 70-90% match
    LOW = "low"        # < 70% match


class SupplierConsolidationEngine:
    """
    Identifies and consolidates duplicate suppliers in the system.
    
    Handles:
    - Similar name detection (case-insensitive, typo-tolerant)
    - Phone/email matching
    - Similar product mix
    - Manual consolidation requests
    - Merge tracking and audit trail
    """
    
    def __init__(self, db):
        self.db = db
        self.logger = logger
    
    async def find_duplicate_suppliers(self) -> List[Dict[str, Any]]:
        """
        Scan all suppliers for potential duplicates.
        
        Returns list of duplicate groups with confidence scores.
        """
        try:
            suppliers = await self.db.suppliers.find({}).to_list(None)
            self.logger.info(f"[CONSOLIDATION] Scanning {len(suppliers)} suppliers for duplicates")
            
            duplicates = []
            checked = set()
            
            for i, supplier1 in enumerate(suppliers):
                supplier1_id = supplier1.get("id")
                if supplier1_id in checked:
                    continue
                
                duplicate_group = [supplier1]
                
                # Compare with remaining suppliers
                for j in range(i + 1, len(suppliers)):
                    supplier2 = suppliers[j]
                    supplier2_id = supplier2.get("id")
                    
                    if supplier2_id in checked:
                        continue
                    
                    confidence = await self._calculate_match_confidence(supplier1, supplier2)
                    
                    if confidence["score"] > 0.70:  # 70% or higher
                        duplicate_group.append({
                            **supplier2,
                            "_match_confidence": confidence["score"],
                            "_match_reasons": confidence["reasons"]
                        })
                        checked.add(supplier2_id)
                
                # If duplicates found, add group to results
                if len(duplicate_group) > 1:
                    duplicates.append({
                        "master_id": supplier1_id,
                        "master_name": supplier1.get("name"),
                        "duplicates": duplicate_group[1:],
                        "group_size": len(duplicate_group),
                        "consolidated_count": 0
                    })
                    checked.add(supplier1_id)
            
            self.logger.info(
                f"[CONSOLIDATION] Found {len(duplicates)} duplicate groups "
                f"affecting {sum(g['group_size'] for g in duplicates)} suppliers"
            )
            
            return duplicates
            
        except Exception as e:
            self.logger.error(f"Error finding duplicates: {str(e)}")
            return []
    
    async def _calculate_match_confidence(
        self,
        supplier1: Dict[str, Any],
        supplier2: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate confidence that two suppliers are duplicates.
        
        Matches on:
        - Name similarity (weighted 40%)
        - Phone number (weighted 30%)
        - Email (weighted 20%)
        - Product mix (weighted 10%)
        """
        reasons = []
        scores = []
        
        # 1. Name similarity (40%)
        name1 = supplier1.get("name", "").lower().strip()
        name2 = supplier2.get("name", "").lower().strip()
        
        name_ratio = difflib.SequenceMatcher(None, name1, name2).ratio()
        
        if name_ratio > 0.85:
            reasons.append(f"Name match: {name_ratio:.0%}")
            scores.append(name_ratio * 0.40)
        elif name_ratio > 0.70:
            reasons.append(f"Name partial match: {name_ratio:.0%}")
            scores.append(name_ratio * 0.20)
        
        # 2. Phone match (30%)
        phone1 = supplier1.get("phone", "").replace(" ", "").replace("-", "")
        phone2 = supplier2.get("phone", "").replace(" ", "").replace("-", "")
        
        if phone1 and phone2 and phone1 == phone2:
            reasons.append("Phone matches exactly")
            scores.append(0.30)
        elif phone1 and phone2:
            phone_ratio = difflib.SequenceMatcher(None, phone1, phone2).ratio()
            if phone_ratio > 0.80:
                reasons.append(f"Phone partial match: {phone_ratio:.0%}")
                scores.append(phone_ratio * 0.20)
        
        # 3. Email match (20%)
        email1 = supplier1.get("email", "").lower()
        email2 = supplier2.get("email", "").lower()
        
        if email1 and email2:
            if email1 == email2:
                reasons.append("Email matches exactly")
                scores.append(0.20)
            else:
                email_ratio = difflib.SequenceMatcher(None, email1, email2).ratio()
                if email_ratio > 0.80:
                    reasons.append(f"Email partial match: {email_ratio:.0%}")
                    scores.append(email_ratio * 0.10)
        
        # 4. Product mix similarity (10%)
        products1 = set(supplier1.get("products_supplied", []))
        products2 = set(supplier2.get("products_supplied", []))
        
        if products1 and products2:
            intersection = len(products1.intersection(products2))
            union = len(products1.union(products2))
            product_ratio = intersection / union if union > 0 else 0
            
            if product_ratio > 0.60:
                reasons.append(f"Product overlap: {product_ratio:.0%}")
                scores.append(product_ratio * 0.10)
        
        total_score = min(sum(scores), 1.0)  # Cap at 100%
        
        return {
            "score": total_score,
            "reasons": reasons,
            "name_similarity": name_ratio,
            "phone_match": phone1 == phone2 if phone1 and phone2 else None,
            "email_match": email1 == email2 if email1 and email2 else None
        }
    
    async def consolidate_suppliers(
        self,
        master_supplier_id: str,
        duplicate_supplier_ids: List[str],
        merge_strategy: str = "master"
    ) -> Dict[str, Any]:
        """
        Consolidate multiple suppliers into one master record.
        
        Merge strategies:
        - "master": Keep master supplier data
        - "best": Use best available data from any supplier
        - "combine": Combine all data where possible
        
        Returns merge result with statistics.
        """
        try:
            master = await self.db.suppliers.find_one({"id": master_supplier_id})
            
            if not master:
                self.logger.error(f"Master supplier {master_supplier_id} not found")
                return {"success": False, "error": "Master supplier not found"}
            
            # Get all duplicate suppliers
            duplicates = []
            for dup_id in duplicate_supplier_ids:
                dup = await self.db.suppliers.find_one({"id": dup_id})
                if dup:
                    duplicates.append(dup)
            
            self.logger.info(
                f"[CONSOLIDATION] Consolidating {len(duplicates)} suppliers into {master_supplier_id}"
            )
            
            # Merge data based on strategy
            merged_data = await self._merge_supplier_data(master, duplicates, merge_strategy)
            
            # Update master supplier
            await self.db.suppliers.update_one(
                {"id": master_supplier_id},
                {"$set": merged_data}
            )
            
            # Update all orders to use master supplier ID
            orders_updated = await self.db.procurement_orders.update_many(
                {"supplier_id": {"$in": duplicate_supplier_ids}},
                {"$set": {"supplier_id": master_supplier_id}}
            )
            
            # Mark duplicates as consolidated (don't delete, keep for audit)
            await self.db.suppliers.update_many(
                {"id": {"$in": duplicate_supplier_ids}},
                {
                    "$set": {
                        "is_consolidated": True,
                        "consolidated_into": master_supplier_id,
                        "consolidated_at": datetime.now()
                    }
                }
            )
            
            # Log consolidation
            audit_entry = {
                "timestamp": datetime.now(),
                "action": "consolidate",
                "master_id": master_supplier_id,
                "consolidated_ids": duplicate_supplier_ids,
                "merge_strategy": merge_strategy,
                "orders_updated": orders_updated.modified_count,
                "merge_data": merged_data
            }
            
            await self.db.supplier_consolidation_audit.insert_one(audit_entry)
            
            result = {
                "success": True,
                "master_id": master_supplier_id,
                "consolidated_count": len(duplicates),
                "orders_updated": orders_updated.modified_count,
                "consolidated_ids": duplicate_supplier_ids,
                "merge_strategy": merge_strategy
            }
            
            self.logger.info(f"[CONSOLIDATION] Consolidation complete: {result}")
            return result
            
        except Exception as e:
            self.logger.error(f"Error consolidating suppliers: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _merge_supplier_data(
        self,
        master: Dict[str, Any],
        duplicates: List[Dict[str, Any]],
        strategy: str
    ) -> Dict[str, Any]:
        """
        Merge data from multiple suppliers based on strategy.
        """
        merged = {**master}
        
        if strategy == "master":
            # Keep master data as-is (minimal merge)
            pass
        
        elif strategy == "best":
            # Use best available data for each field
            for field in ["email", "phone", "address"]:
                for dup in duplicates:
                    if dup.get(field) and not master.get(field):
                        merged[field] = dup[field]
                        break
        
        elif strategy == "combine":
            # Combine products and contact information
            all_products = set(master.get("products_supplied", []))
            all_emails = [master.get("email")] if master.get("email") else []
            all_phones = [master.get("phone")] if master.get("phone") else []
            
            for dup in duplicates:
                # Add unique products
                all_products.update(dup.get("products_supplied", []))
                
                # Add alternate contact info
                if dup.get("email") and dup["email"] not in all_emails:
                    all_emails.append(dup["email"])
                if dup.get("phone") and dup["phone"] not in all_phones:
                    all_phones.append(dup["phone"])
            
            merged["products_supplied"] = list(all_products)
            merged["alternate_emails"] = all_emails[1:] if len(all_emails) > 1 else None
            merged["alternate_phones"] = all_phones[1:] if len(all_phones) > 1 else None
        
        # Add consolidation metadata
        merged["consolidated_at"] = datetime.now()
        merged["consolidation_source_count"] = len(duplicates) + 1
        
        return merged
    
    async def get_consolidation_status(self) -> Dict[str, Any]:
        """
        Get current consolidation status.
        """
        try:
            total_suppliers = await self.db.suppliers.count_documents({})
            active_suppliers = await self.db.suppliers.count_documents({"is_active": True})
            consolidated = await self.db.suppliers.count_documents({"is_consolidated": True})
            
            # Get consolidation statistics
            consolidation_stats = await self.db.supplier_consolidation_audit.aggregate([
                {
                    "$group": {
                        "_id": None,
                        "total_consolidations": {"$sum": 1},
                        "total_consolidated": {"$sum": {"$size": "$consolidated_ids"}},
                        "total_orders_updated": {"$sum": "$orders_updated"}
                    }
                }
            ]).to_list(1)
            
            stats = consolidation_stats[0] if consolidation_stats else {}
            
            return {
                "total_suppliers": total_suppliers,
                "active_suppliers": active_suppliers,
                "consolidated_count": consolidated,
                "duplicate_reduction": f"{(consolidated / total_suppliers * 100):.1f}%" if total_suppliers > 0 else "0%",
                "consolidation_operations": stats.get("total_consolidations", 0),
                "suppliers_consolidated": stats.get("total_consolidated", 0),
                "orders_migrated": stats.get("total_orders_updated", 0)
            }
            
        except Exception as e:
            self.logger.error(f"Error getting consolidation status: {str(e)}")
            return {}
    
    async def get_consolidation_recommendations(self, confidence_threshold: float = 0.80) -> List[Dict[str, Any]]:
        """
        Get consolidation recommendations based on duplicate detection.
        
        Args:
            confidence_threshold: Minimum confidence to recommend (0.0-1.0)
        """
        duplicates = await self.find_duplicate_suppliers()
        
        recommendations = []
        for group in duplicates:
            # Filter to only high-confidence matches
            high_confidence_dups = [
                d for d in group["duplicates"]
                if d.get("_match_confidence", 0) >= confidence_threshold
            ]
            
            if high_confidence_dups:
                recommendations.append({
                    "master_supplier": group["master_name"],
                    "master_id": group["master_id"],
                    "potential_duplicates": [
                        {
                            "id": d.get("id"),
                            "name": d.get("name"),
                            "confidence": d.get("_match_confidence"),
                            "reasons": d.get("_match_reasons")
                        }
                        for d in high_confidence_dups
                    ],
                    "action": "review" if confidence_threshold < 0.90 else "auto_merge"
                })
        
        return recommendations
    
    async def get_supplier_quality_metrics(self) -> Dict[str, Any]:
        """
        Get data quality metrics for all suppliers.
        """
        try:
            suppliers = await self.db.suppliers.find({}).to_list(None)
            
            total = len(suppliers)
            metrics = {
                "total_suppliers": total,
                "quality_metrics": {
                    "with_email": 0,
                    "with_phone": 0,
                    "with_address": 0,
                    "with_products": 0,
                    "active_status": 0,
                    "has_user_link": 0
                },
                "issues": {
                    "missing_email": 0,
                    "missing_phone": 0,
                    "missing_address": 0,
                    "no_products": 0,
                    "inactive": 0,
                    "no_user_link": 0
                }
            }
            
            for supplier in suppliers:
                if supplier.get("email"):
                    metrics["quality_metrics"]["with_email"] += 1
                else:
                    metrics["issues"]["missing_email"] += 1
                
                if supplier.get("phone"):
                    metrics["quality_metrics"]["with_phone"] += 1
                else:
                    metrics["issues"]["missing_phone"] += 1
                
                if supplier.get("address"):
                    metrics["quality_metrics"]["with_address"] += 1
                else:
                    metrics["issues"]["missing_address"] += 1
                
                if supplier.get("products_supplied"):
                    metrics["quality_metrics"]["with_products"] += 1
                else:
                    metrics["issues"]["no_products"] += 1
                
                if supplier.get("is_active", True):
                    metrics["quality_metrics"]["active_status"] += 1
                else:
                    metrics["issues"]["inactive"] += 1
                
                if supplier.get("user_id"):
                    metrics["quality_metrics"]["has_user_link"] += 1
                else:
                    metrics["issues"]["no_user_link"] += 1
            
            # Calculate completeness scores
            metrics["overall_quality_score"] = (
                (metrics["quality_metrics"]["with_email"] +
                 metrics["quality_metrics"]["with_phone"] +
                 metrics["quality_metrics"]["with_address"] +
                 metrics["quality_metrics"]["with_products"] +
                 metrics["quality_metrics"]["has_user_link"]) / (total * 5) * 100
            ) if total > 0 else 0
            
            metrics["overall_quality_score"] = round(metrics["overall_quality_score"], 1)
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error getting quality metrics: {str(e)}")
            return {}


# Export
__all__ = ["SupplierConsolidationEngine", "SupplierMatchConfidence"]

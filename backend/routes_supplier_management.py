# Phase 1.6: Supplier Management Routes
# REST API endpoints for supplier consolidation, analytics, and management

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


def get_supplier_consolidation_engine(db=Depends()):
    """Get supplier consolidation engine."""
    from backend.supplier_consolidation import SupplierConsolidationEngine
    return SupplierConsolidationEngine(db)


def get_supplier_analytics_engine(db=Depends()):
    """Get supplier analytics engine."""
    from backend.supplier_analytics import SupplierAnalyticsEngine
    return SupplierAnalyticsEngine(db)


# ========== CONSOLIDATION ENDPOINTS ==========

@router.get("/consolidation/duplicates")
async def get_duplicate_suppliers(
    engine = Depends(get_supplier_consolidation_engine)
):
    """
    Find potential duplicate suppliers using fuzzy matching.
    
    Returns list of suppliers with confidence scores and consolidation recommendations.
    """
    try:
        duplicates = await engine.find_duplicate_suppliers()
        
        if not duplicates:
            return {
                "status": "success",
                "duplicates_found": 0,
                "duplicates": []
            }
        
        return {
            "status": "success",
            "duplicates_found": len(duplicates),
            "duplicates": duplicates
        }
    
    except Exception as e:
        logger.error(f"Error finding duplicate suppliers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/consolidation/recommendations")
async def get_consolidation_recommendations(
    engine = Depends(get_supplier_consolidation_engine)
):
    """
    Get automatic consolidation recommendations.
    
    Returns recommended merges with confidence scores and suggested strategy.
    """
    try:
        recommendations = await engine.get_consolidation_recommendations()
        
        return {
            "status": "success",
            "recommendations_count": len(recommendations),
            "recommendations": recommendations,
            "potential_savings": f"₹{len(recommendations) * 5000}/month"  # Placeholder
        }
    
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/consolidation/merge")
async def merge_suppliers(
    master_supplier_id: str,
    duplicate_supplier_ids: List[str],
    merge_strategy: str = "best",  # "master", "best", or "combine"
    engine = Depends(get_supplier_consolidation_engine)
):
    """
    Execute consolidation: merge duplicate suppliers into master supplier.
    
    Args:
    - master_supplier_id: Supplier to keep
    - duplicate_supplier_ids: Suppliers to merge into master
    - merge_strategy: "master" (keep master), "best" (use best data), "combine" (merge all)
    
    Creates audit trail of all changes.
    """
    try:
        # Validate strategy
        if merge_strategy not in ["master", "best", "combine"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid merge_strategy. Use 'master', 'best', or 'combine'"
            )
        
        # Perform consolidation
        result = await engine.consolidate_suppliers(
            master_supplier_id,
            duplicate_supplier_ids,
            merge_strategy
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "status": "success",
            "message": f"Consolidated {len(duplicate_supplier_ids)} suppliers into {master_supplier_id}",
            "consolidation_result": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error consolidating suppliers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/consolidation/status")
async def get_consolidation_status(
    engine = Depends(get_supplier_consolidation_engine)
):
    """
    Get current consolidation status and statistics.
    
    Returns:
    - Total consolidation candidates
    - Consolidations completed
    - Consolidations pending
    - Potential data quality improvements
    """
    try:
        status = await engine.get_consolidation_status()
        
        return {
            "status": "success",
            "consolidation_status": status
        }
    
    except Exception as e:
        logger.error(f"Error getting consolidation status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== ANALYTICS ENDPOINTS ==========

@router.get("/analytics/dashboard")
async def get_supplier_dashboard(
    supplier_id: Optional[str] = None,
    analytics_engine = Depends(get_supplier_analytics_engine)
):
    """
    Get supplier performance dashboard.
    
    If supplier_id provided: Individual supplier metrics
    Otherwise: System-wide supplier summary
    
    Returns:
    - Order metrics (total, confirmed, delivered, pending)
    - Financial metrics (total amount, average order value)
    - Performance metrics (fulfillment rate, trend)
    - Product information
    - Recent orders
    """
    try:
        dashboard = await analytics_engine.get_supplier_dashboard(supplier_id)
        
        if "error" in dashboard:
            raise HTTPException(status_code=404, detail=dashboard.get("error"))
        
        return {
            "status": "success",
            "dashboard": dashboard
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting supplier dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/product-mapping")
async def get_product_mapping(
    analytics_engine = Depends(get_supplier_analytics_engine)
):
    """
    Get supplier-product mapping and risk analysis.
    
    Returns:
    - Product-supplier relationships
    - Single-supplier products (supply chain risk)
    - Underutilized suppliers
    - Product availability matrix
    """
    try:
        mapping = await analytics_engine.get_supplier_product_mapping()
        
        return {
            "status": "success",
            "mapping": mapping
        }
    
    except Exception as e:
        logger.error(f"Error getting product mapping: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analytics/compare")
async def compare_suppliers(
    supplier_ids: List[str],
    analytics_engine = Depends(get_supplier_analytics_engine)
):
    """
    Compare performance metrics across multiple suppliers.
    
    Returns side-by-side comparison of:
    - Order volume and fulfillment
    - Financial metrics
    - Performance rates
    """
    try:
        if not supplier_ids or len(supplier_ids) < 2:
            raise HTTPException(
                status_code=400,
                detail="Provide at least 2 supplier IDs for comparison"
            )
        
        comparison = await analytics_engine.get_supplier_comparison(supplier_ids)
        
        return {
            "status": "success",
            "comparison": comparison
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing suppliers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/health-check")
async def get_supplier_health_check(
    analytics_engine = Depends(get_supplier_analytics_engine)
):
    """
    Get overall supplier system health check.
    
    Returns:
    - Data quality score
    - Performance metrics
    - Supply chain relationships health
    - Issues and recommendations
    - Overall health status (GOOD, WARNING, CRITICAL)
    """
    try:
        health = await analytics_engine.get_supplier_health_check()
        
        return {
            "status": "success",
            "health_check": health
        }
    
    except Exception as e:
        logger.error(f"Error performing health check: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/quality-metrics")
async def get_quality_metrics(
    engine = Depends(get_supplier_consolidation_engine)
):
    """
    Get supplier data quality metrics and issues.
    
    Returns:
    - Data completeness scores
    - Missing required fields by supplier
    - Data quality recommendations
    - Areas for improvement
    """
    try:
        metrics = await engine.get_supplier_quality_metrics()
        
        return {
            "status": "success",
            "quality_metrics": metrics
        }
    
    except Exception as e:
        logger.error(f"Error getting quality metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== SUPPLIER MANAGEMENT ENDPOINTS ==========

@router.get("/{supplier_id}/history")
async def get_supplier_consolidation_history(
    supplier_id: str,
    db=Depends()
):
    """
    Get consolidation history for a supplier.
    
    Shows:
    - If supplier was consolidated into another (master info)
    - If other suppliers were consolidated into this one
    - Audit trail of changes
    """
    try:
        # Get supplier info
        supplier = await db.suppliers.find_one({"id": supplier_id})
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        history = []
        
        # Check if this supplier was consolidated into another
        if supplier.get("is_consolidated"):
            consolidated_into = supplier.get("consolidated_into")
            master_supplier = await db.suppliers.find_one({"id": consolidated_into})
            history.append({
                "type": "consolidated_into",
                "master_supplier_id": consolidated_into,
                "master_supplier_name": master_supplier.get("name") if master_supplier else "Unknown",
                "timestamp": supplier.get("consolidated_at")
            })
        
        # Get audit trail entries for this supplier
        audits = await db.supplier_consolidation_audit.find(
            {
                "$or": [
                    {"master_id": supplier_id},
                    {"consolidated_ids": supplier_id}
                ]
            },
            {"_id": 0}
        ).to_list(None)
        
        history.extend(audits)
        
        return {
            "status": "success",
            "supplier_id": supplier_id,
            "supplier_name": supplier.get("name"),
            "consolidation_history": history
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting supplier history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{supplier_id}/link-user")
async def link_supplier_to_user(
    supplier_id: str,
    user_id: str,
    db=Depends()
):
    """
    Link supplier to a user account.
    
    Enables supplier login and self-service portal access.
    """
    try:
        result = await db.suppliers.update_one(
            {"id": supplier_id},
            {"$set": {"user_id": user_id, "updated_at": datetime.now()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        return {
            "status": "success",
            "message": f"Supplier {supplier_id} linked to user {user_id}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error linking supplier to user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{supplier_id}/add-alternate-contact")
async def add_alternate_contact(
    supplier_id: str,
    contact_type: str,  # "email" or "phone"
    contact_value: str,
    db=Depends()
):
    """
    Add alternate contact information (email or phone) to supplier.
    
    Enables multiple contact points for supplier communication.
    """
    try:
        if contact_type not in ["email", "phone"]:
            raise HTTPException(
                status_code=400,
                detail="contact_type must be 'email' or 'phone'"
            )
        
        field_name = f"alternate_{contact_type}s"
        
        result = await db.suppliers.update_one(
            {"id": supplier_id},
            {
                "$addToSet": {field_name: contact_value},
                "$set": {"updated_at": datetime.now()}
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        return {
            "status": "success",
            "message": f"Alternate {contact_type} added to supplier",
            "supplier_id": supplier_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding alternate contact: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Export
__all__ = ["router"]

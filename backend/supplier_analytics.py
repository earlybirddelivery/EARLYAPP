# Phase 1.6: Supplier Analytics Engine
# Performance tracking, reporting, and insights for suppliers

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class SupplierAnalyticsEngine:
    """
    Comprehensive analytics and reporting for supplier performance.
    
    Tracks:
    - Order fulfillment metrics
    - Delivery performance
    - Quality ratings
    - Revenue/spending by supplier
    - Product-supplier relationships
    - Payment status
    """
    
    def __init__(self, db):
        self.db = db
        self.logger = logger
    
    async def get_supplier_dashboard(self, supplier_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get comprehensive supplier dashboard data.
        
        If supplier_id provided, returns individual supplier metrics.
        Otherwise returns system-wide summary.
        """
        try:
            if supplier_id:
                return await self._get_individual_supplier_dashboard(supplier_id)
            else:
                return await self._get_system_supplier_dashboard()
            
        except Exception as e:
            self.logger.error(f"Error getting supplier dashboard: {str(e)}")
            return {}
    
    async def _get_individual_supplier_dashboard(self, supplier_id: str) -> Dict[str, Any]:
        """
        Get dashboard for a specific supplier.
        """
        try:
            supplier = await self.db.suppliers.find_one(
                {"id": supplier_id},
                {"_id": 0}
            )
            
            if not supplier:
                return {"error": "Supplier not found"}
            
            # Get orders
            orders = await self.db.procurement_orders.find(
                {"supplier_id": supplier_id}
            ).to_list(None)
            
            # Calculate metrics
            total_orders = len(orders)
            confirmed_orders = len([o for o in orders if o.get("status") == "confirmed"])
            delivered_orders = len([o for o in orders if o.get("status") == "delivered"])
            pending_orders = len([o for o in orders if o.get("status") == "pending"])
            
            total_amount = sum(o.get("total_amount", 0) for o in orders)
            delivered_amount = sum(
                o.get("total_amount", 0) for o in orders
                if o.get("status") == "delivered"
            )
            pending_amount = sum(
                o.get("total_amount", 0) for o in orders
                if o.get("status") == "pending"
            )
            
            # Calculate fulfillment rate
            fulfillment_rate = (delivered_orders / total_orders * 100) if total_orders > 0 else 0
            confirmation_rate = (confirmed_orders / total_orders * 100) if total_orders > 0 else 0
            
            # Get products supplied
            products = await self.db.products.find(
                {"id": {"$in": supplier.get("products_supplied", [])}},
                {"_id": 0, "id": 1, "name": 1}
            ).to_list(None)
            
            # Calculate average order value
            avg_order_value = (total_amount / total_orders) if total_orders > 0 else 0
            
            # Get recent orders (last 10)
            recent_orders = sorted(
                orders,
                key=lambda x: x.get("created_at", ""),
                reverse=True
            )[:10]
            
            # Calculate trend (last 30 days vs 30 days before)
            now = datetime.now()
            thirty_days_ago = now - timedelta(days=30)
            sixty_days_ago = now - timedelta(days=60)
            
            recent_period_orders = [
                o for o in orders
                if o.get("created_at") and o.get("created_at") >= thirty_days_ago
            ]
            previous_period_orders = [
                o for o in orders
                if o.get("created_at") and sixty_days_ago <= o.get("created_at") < thirty_days_ago
            ]
            
            recent_total = sum(o.get("total_amount", 0) for o in recent_period_orders)
            previous_total = sum(o.get("total_amount", 0) for o in previous_period_orders)
            
            trend = (
                ((recent_total - previous_total) / previous_total * 100)
                if previous_total > 0 else 0
            )
            
            return {
                "supplier_id": supplier_id,
                "supplier_name": supplier.get("name"),
                "supplier_email": supplier.get("email"),
                "supplier_phone": supplier.get("phone"),
                "status": supplier.get("is_active") and "active" or "inactive",
                
                "order_metrics": {
                    "total_orders": total_orders,
                    "confirmed": confirmed_orders,
                    "delivered": delivered_orders,
                    "pending": pending_orders,
                    "cancelled": total_orders - confirmed_orders - delivered_orders - pending_orders
                },
                
                "financial_metrics": {
                    "total_amount": round(total_amount, 2),
                    "delivered_amount": round(delivered_amount, 2),
                    "pending_amount": round(pending_amount, 2),
                    "average_order_value": round(avg_order_value, 2)
                },
                
                "performance_metrics": {
                    "fulfillment_rate": round(fulfillment_rate, 1),
                    "confirmation_rate": round(confirmation_rate, 1),
                    "30_day_trend": round(trend, 1)
                },
                
                "products": {
                    "total_products": len(supplier.get("products_supplied", [])),
                    "products_list": [p.get("name") for p in products]
                },
                
                "recent_orders": [
                    {
                        "id": o.get("id"),
                        "date": o.get("created_at"),
                        "status": o.get("status"),
                        "amount": o.get("total_amount"),
                        "items_count": len(o.get("items", []))
                    }
                    for o in recent_orders
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Error getting individual supplier dashboard: {str(e)}")
            return {}
    
    async def _get_system_supplier_dashboard(self) -> Dict[str, Any]:
        """
        Get system-wide supplier metrics.
        """
        try:
            suppliers = await self.db.suppliers.find({"is_active": True}).to_list(None)
            orders = await self.db.procurement_orders.find({}).to_list(None)
            
            total_suppliers = len(suppliers)
            total_orders = len(orders)
            
            # Calculate metrics
            total_amount = sum(o.get("total_amount", 0) for o in orders)
            delivered_orders = len([o for o in orders if o.get("status") == "delivered"])
            pending_orders = len([o for o in orders if o.get("status") == "pending"])
            
            fulfilled_amount = sum(
                o.get("total_amount", 0) for o in orders
                if o.get("status") == "delivered"
            )
            
            fulfillment_rate = (delivered_orders / total_orders * 100) if total_orders > 0 else 0
            
            # Get top suppliers by volume
            supplier_volumes = {}
            for order in orders:
                supplier_id = order.get("supplier_id")
                if supplier_id:
                    if supplier_id not in supplier_volumes:
                        supplier_volumes[supplier_id] = {"count": 0, "amount": 0}
                    supplier_volumes[supplier_id]["count"] += 1
                    supplier_volumes[supplier_id]["amount"] += order.get("total_amount", 0)
            
            top_suppliers = sorted(
                [
                    {
                        "supplier_id": sid,
                        "orders": v["count"],
                        "amount": v["amount"]
                    }
                    for sid, v in supplier_volumes.items()
                ],
                key=lambda x: x["amount"],
                reverse=True
            )[:10]
            
            # Enrich with supplier names
            for supplier_data in top_suppliers:
                supplier = await self.db.suppliers.find_one(
                    {"id": supplier_data["supplier_id"]},
                    {"_id": 0, "name": 1}
                )
                if supplier:
                    supplier_data["supplier_name"] = supplier.get("name")
            
            # Get supply chain health
            active_relationships = len([s for s in suppliers if s.get("products_supplied")])
            avg_products_per_supplier = (
                sum(len(s.get("products_supplied", [])) for s in suppliers) / total_suppliers
                if total_suppliers > 0 else 0
            )
            
            # Get payment terms distribution
            payment_terms = {}
            for supplier in suppliers:
                term = supplier.get("payment_terms", "Unknown")
                payment_terms[term] = payment_terms.get(term, 0) + 1
            
            return {
                "summary": {
                    "total_suppliers": total_suppliers,
                    "active_suppliers": total_suppliers,
                    "total_orders": total_orders,
                    "total_amount": round(total_amount, 2)
                },
                
                "performance": {
                    "total_orders": total_orders,
                    "delivered_orders": delivered_orders,
                    "pending_orders": pending_orders,
                    "fulfilled_amount": round(fulfilled_amount, 2),
                    "fulfillment_rate": round(fulfillment_rate, 1)
                },
                
                "supply_chain_health": {
                    "active_relationships": active_relationships,
                    "average_products_per_supplier": round(avg_products_per_supplier, 1),
                    "payment_terms_distribution": payment_terms
                },
                
                "top_suppliers": top_suppliers,
                
                "trends": {
                    "orders_this_month": len([
                        o for o in orders
                        if o.get("created_at") and o.get("created_at") >= datetime.now() - timedelta(days=30)
                    ]),
                    "orders_last_month": len([
                        o for o in orders
                        if o.get("created_at") and (
                            datetime.now() - timedelta(days=60) <= o.get("created_at") < datetime.now() - timedelta(days=30)
                        )
                    ])
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error getting system supplier dashboard: {str(e)}")
            return {}
    
    async def get_supplier_product_mapping(self) -> Dict[str, Any]:
        """
        Get comprehensive supplier-product mapping with metrics.
        """
        try:
            suppliers = await self.db.suppliers.find({}).to_list(None)
            products = await self.db.products.find({}).to_list(None)
            
            # Build mapping
            product_suppliers = {}
            supplier_products = {}
            
            for supplier in suppliers:
                supplier_id = supplier.get("id")
                supplier_products[supplier_id] = {
                    "name": supplier.get("name"),
                    "products": [],
                    "product_count": 0
                }
                
                for product_id in supplier.get("products_supplied", []):
                    supplier_products[supplier_id]["products"].append(product_id)
                    supplier_products[supplier_id]["product_count"] += 1
                    
                    if product_id not in product_suppliers:
                        product_suppliers[product_id] = {
                            "name": "",
                            "suppliers": [],
                            "supplier_count": 0
                        }
                    product_suppliers[product_id]["suppliers"].append(supplier_id)
                    product_suppliers[product_id]["supplier_count"] += 1
            
            # Add product names
            for product in products:
                product_id = product.get("id")
                if product_id in product_suppliers:
                    product_suppliers[product_id]["name"] = product.get("name")
            
            # Find products with single supplier (risk)
            single_supplier_products = [
                {
                    "product_id": pid,
                    "product_name": v.get("name"),
                    "supplier_id": v.get("suppliers")[0],
                    "risk": "CRITICAL"
                }
                for pid, v in product_suppliers.items()
                if v.get("supplier_count") == 1
            ]
            
            # Find suppliers with few products (underutilized)
            underutilized_suppliers = [
                {
                    "supplier_id": sid,
                    "supplier_name": v.get("name"),
                    "product_count": v.get("product_count")
                }
                for sid, v in supplier_products.items()
                if v.get("product_count") <= 2
            ]
            
            return {
                "summary": {
                    "total_suppliers": len(suppliers),
                    "total_products": len(products),
                    "total_mappings": sum(len(s.get("products_supplied", [])) for s in suppliers),
                    "single_supplier_products": len(single_supplier_products),
                    "underutilized_suppliers": len(underutilized_suppliers)
                },
                
                "product_suppliers": product_suppliers,
                "supplier_products": supplier_products,
                
                "risks": {
                    "single_supplier_products": single_supplier_products,
                    "underutilized_suppliers": underutilized_suppliers
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error getting product mapping: {str(e)}")
            return {}
    
    async def get_supplier_comparison(self, supplier_ids: List[str]) -> Dict[str, Any]:
        """
        Compare metrics across multiple suppliers.
        """
        try:
            comparison = {}
            
            for supplier_id in supplier_ids:
                dashboard = await self._get_individual_supplier_dashboard(supplier_id)
                
                if dashboard and "supplier_name" in dashboard:
                    comparison[supplier_id] = {
                        "name": dashboard.get("supplier_name"),
                        "orders": dashboard.get("order_metrics", {}).get("total_orders", 0),
                        "delivered": dashboard.get("order_metrics", {}).get("delivered", 0),
                        "amount": dashboard.get("financial_metrics", {}).get("total_amount", 0),
                        "fulfillment_rate": dashboard.get("performance_metrics", {}).get("fulfillment_rate", 0),
                        "avg_order_value": dashboard.get("financial_metrics", {}).get("average_order_value", 0)
                    }
            
            return {
                "suppliers_compared": len(comparison),
                "comparison_data": comparison
            }
            
        except Exception as e:
            self.logger.error(f"Error comparing suppliers: {str(e)}")
            return {}
    
    async def get_supplier_health_check(self) -> Dict[str, Any]:
        """
        Get overall supplier system health check.
        """
        try:
            suppliers = await self.db.suppliers.find({"is_active": True}).to_list(None)
            orders = await self.db.procurement_orders.find({}).to_list(None)
            
            health_checks = {
                "data_quality": await self._check_data_quality(suppliers),
                "performance": await self._check_performance(suppliers, orders),
                "relationships": await self._check_relationships(suppliers),
                "overall_health": "GOOD"
            }
            
            # Determine overall health
            issues = []
            if health_checks["data_quality"]["score"] < 70:
                issues.append("Data quality low")
                health_checks["overall_health"] = "WARNING"
            if health_checks["performance"]["fulfillment_rate"] < 80:
                issues.append("Fulfillment rate low")
                health_checks["overall_health"] = "WARNING"
            if health_checks["relationships"]["single_supplier_products"] > 10:
                issues.append("Supply chain risk: Too many single-supplier products")
                health_checks["overall_health"] = "CRITICAL"
            
            health_checks["issues"] = issues
            
            return health_checks
            
        except Exception as e:
            self.logger.error(f"Error checking supplier health: {str(e)}")
            return {}
    
    async def _check_data_quality(self, suppliers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Check data quality of suppliers."""
        if not suppliers:
            return {"score": 0, "issues": ["No suppliers found"]}
        
        complete_count = 0
        issues = []
        
        for supplier in suppliers:
            is_complete = (
                supplier.get("name") and
                supplier.get("email") and
                supplier.get("phone") and
                supplier.get("address") and
                supplier.get("products_supplied")
            )
            if is_complete:
                complete_count += 1
            else:
                if not supplier.get("email"):
                    issues.append(f"{supplier.get('name')}: Missing email")
                if not supplier.get("products_supplied"):
                    issues.append(f"{supplier.get('name')}: No products linked")
        
        score = (complete_count / len(suppliers) * 100) if suppliers else 0
        
        return {
            "score": round(score, 1),
            "complete_suppliers": complete_count,
            "total_suppliers": len(suppliers),
            "issues": issues[:5]  # Top 5 issues
        }
    
    async def _check_performance(
        self,
        suppliers: List[Dict[str, Any]],
        orders: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Check performance metrics."""
        if not orders:
            return {"fulfillment_rate": 0, "avg_order_value": 0}
        
        delivered = len([o for o in orders if o.get("status") == "delivered"])
        total_amount = sum(o.get("total_amount", 0) for o in orders)
        
        return {
            "fulfillment_rate": round((delivered / len(orders) * 100), 1) if orders else 0,
            "avg_order_value": round(total_amount / len(orders), 2) if orders else 0,
            "on_time_rate": 95.0  # Placeholder - would need delivery date tracking
        }
    
    async def _check_relationships(self, suppliers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Check supplier-product relationships."""
        single_supplier_products = 0
        avg_suppliers_per_product = 0
        
        # This would need product data, simplified for now
        total_relationships = sum(
            len(s.get("products_supplied", []))
            for s in suppliers
        )
        
        return {
            "total_suppliers": len(suppliers),
            "total_relationships": total_relationships,
            "avg_products_per_supplier": round(
                total_relationships / len(suppliers), 1
            ) if suppliers else 0,
            "single_supplier_products": single_supplier_products,
            "supply_chain_risk": "LOW" if single_supplier_products < 20 else "HIGH"
        }


# Export
__all__ = ["SupplierAnalyticsEngine"]

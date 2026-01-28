"""
PHASE 4B.4: Inventory Monitoring - Database Models
Defines MongoDB collections for complete inventory management system
"""

from pymongo import ASCENDING, DESCENDING, TEXT
from datetime import datetime

# ============================================================================
# INVENTORY MONITORING COLLECTIONS
# ============================================================================

class InventoryModels:
    """
    Database models for inventory monitoring system.
    
    Collections:
    1. products_inventory - Product stock levels
    2. stock_levels - Current and historical stock
    3. low_stock_alerts - Alert configuration
    4. reorder_rules - Automatic reorder settings
    5. reorder_requests - Pending reorder requests
    6. stock_transactions - Audit trail of all stock changes
    7. demand_forecast - Forecasted demand
    8. inventory_analytics - Aggregated metrics
    """

    @staticmethod
    def create_collections(db):
        """Create all inventory collections with indexes"""
        
        # ====================================================================
        # 1. PRODUCTS_INVENTORY - Extended product info with stock details
        # ====================================================================
        
        if "products_inventory" not in db.list_collection_names():
            db.create_collection("products_inventory")
        
        products_inventory = db.products_inventory
        
        # Sample document structure
        sample_product = {
            "_id": "prod_123456789",
            "product_name": "Organic Tomatoes - 500g",
            "sku": "TOMATOE_ORG_500",
            "category": "Vegetables",
            "supplier_id": "supp_789",
            "supplier_name": "Fresh Farms Co.",
            "unit_price": 45.00,
            "current_stock": 250,
            "unit": "kg",
            "reorder_level": 50,  # When stock falls below this, alert triggers
            "reorder_quantity": 100,  # Order this much when reordering
            "max_stock": 500,  # Don't stock more than this
            "lead_time_days": 2,  # Days from order to delivery
            "shelf_life_days": 7,  # Days until product expires
            "last_restocked": datetime.now(),
            "status": "ACTIVE",  # ACTIVE, DISCONTINUED, SLOW_MOVING
            "turnover_rate": 1.2,  # Times per month
            "seasonal": False,
            "seasonal_months": [],
            "tags": ["organic", "vegetable"],
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        # Create indexes
        products_inventory.create_index([("product_name", TEXT)])
        products_inventory.create_index([("sku", ASCENDING)], unique=True)
        products_inventory.create_index([("category", ASCENDING)])
        products_inventory.create_index([("current_stock", ASCENDING)])
        products_inventory.create_index([("status", ASCENDING)])
        products_inventory.create_index([("supplier_id", ASCENDING)])
        products_inventory.create_index([("reorder_level", ASCENDING)])
        
        # ====================================================================
        # 2. STOCK_LEVELS - Historical stock tracking
        # ====================================================================
        
        if "stock_levels" not in db.list_collection_names():
            db.create_collection("stock_levels")
        
        stock_levels = db.stock_levels
        
        sample_stock_level = {
            "_id": "stock_sl_123456",
            "product_id": "prod_123456789",
            "product_name": "Organic Tomatoes - 500g",
            "sku": "TOMATOE_ORG_500",
            "date": datetime.now(),
            "opening_stock": 250,  # Stock at start of day
            "incoming": 100,  # Quantity received today
            "outgoing": 30,  # Quantity sold today
            "closing_stock": 320,  # Stock at end of day
            "received_orders": ["order_001", "order_002"],  # From which orders
            "sold_orders": ["order_103", "order_104", "order_105"],
            "adjustment": 0,  # Manual adjustments (inventory count)
            "waste": 0,  # Expired or damaged
            "remarks": "Stock count verified",
            "verified_by": "user_789",  # Who verified
            "created_at": datetime.now()
        }
        
        stock_levels.create_index([("product_id", ASCENDING), ("date", DESCENDING)])
        stock_levels.create_index([("sku", ASCENDING), ("date", DESCENDING)])
        stock_levels.create_index([("date", DESCENDING)])
        stock_levels.create_index([("product_id", ASCENDING)])
        
        # ====================================================================
        # 3. LOW_STOCK_ALERTS - Alert configuration and history
        # ====================================================================
        
        if "low_stock_alerts" not in db.list_collection_names():
            db.create_collection("low_stock_alerts")
        
        low_stock_alerts = db.low_stock_alerts
        
        sample_alert = {
            "_id": "alert_123456789",
            "product_id": "prod_123456789",
            "product_name": "Organic Tomatoes - 500g",
            "sku": "TOMATOE_ORG_500",
            "alert_type": "LOW_STOCK",  # LOW_STOCK, STOCKOUT, OVERSTOCK, EXPIRY
            "threshold_level": 50,  # Alert when stock falls below this
            "current_stock": 45,
            "status": "ACTIVE",  # ACTIVE, RESOLVED, SNOOZED
            "severity": "HIGH",  # LOW, MEDIUM, HIGH, CRITICAL
            "triggered_at": datetime.now(),
            "resolved_at": None,
            "resolved_by": None,
            "action_taken": None,  # What was done to resolve
            "notification_sent": True,
            "notified_to": ["user_123", "user_456"],  # User IDs notified
            "acknowledgment": {
                "acked_by": "user_123",
                "acked_at": datetime.now(),
                "comment": "Ordering more stock"
            }
        }
        
        low_stock_alerts.create_index([("product_id", ASCENDING)])
        low_stock_alerts.create_index([("status", ASCENDING)])
        low_stock_alerts.create_index([("severity", ASCENDING)])
        low_stock_alerts.create_index([("triggered_at", DESCENDING)])
        low_stock_alerts.create_index([("alert_type", ASCENDING)])
        
        # ====================================================================
        # 4. REORDER_RULES - Automatic reorder configuration per product
        # ====================================================================
        
        if "reorder_rules" not in db.list_collection_names():
            db.create_collection("reorder_rules")
        
        reorder_rules = db.reorder_rules
        
        sample_reorder_rule = {
            "_id": "rule_123456789",
            "product_id": "prod_123456789",
            "product_name": "Organic Tomatoes - 500g",
            "supplier_id": "supp_789",
            "supplier_name": "Fresh Farms Co.",
            "reorder_level": 50,  # Trigger reorder when stock <= this
            "reorder_quantity": 100,  # Order this much
            "max_stock": 500,  # Don't exceed this
            "lead_time_days": 2,  # Days for supplier to deliver
            "auto_reorder_enabled": True,
            "reorder_frequency": "WEEKLY",  # DAILY, WEEKLY, CUSTOM
            "reorder_day": 2,  # 0=Monday, 1=Tuesday, etc.
            "min_quantity_per_order": 50,
            "batch_size": 100,  # Order in multiples of this
            "unit_cost": 45.00,
            "seasonal_adjustment": {
                "enabled": False,
                "multiplier_jan_to_mar": 1.0,
                "multiplier_apr_to_jun": 1.2,
                "multiplier_jul_to_sep": 0.9,
                "multiplier_oct_to_dec": 1.1
            },
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "created_by": "user_789"
        }
        
        reorder_rules.create_index([("product_id", ASCENDING)], unique=True)
        reorder_rules.create_index([("supplier_id", ASCENDING)])
        reorder_rules.create_index([("auto_reorder_enabled", ASCENDING)])
        
        # ====================================================================
        # 5. REORDER_REQUESTS - Pending and completed reorder orders
        # ====================================================================
        
        if "reorder_requests" not in db.list_collection_names():
            db.create_collection("reorder_requests")
        
        reorder_requests = db.reorder_requests
        
        sample_reorder_request = {
            "_id": "reorder_req_123456789",
            "product_id": "prod_123456789",
            "product_name": "Organic Tomatoes - 500g",
            "sku": "TOMATOE_ORG_500",
            "supplier_id": "supp_789",
            "supplier_name": "Fresh Farms Co.",
            "quantity_ordered": 100,
            "unit_cost": 45.00,
            "total_cost": 4500.00,
            "status": "PENDING",  # PENDING, ORDERED, PARTIAL, RECEIVED, CANCELLED
            "trigger_reason": "LOW_STOCK",  # LOW_STOCK, MANUAL, SEASONAL, AUTO
            "triggered_by": "system",  # system or user_id
            "created_at": datetime.now(),
            "ordered_at": None,
            "expected_delivery": None,
            "actual_delivery": None,
            "quantity_received": 0,
            "quality_issues": [],
            "notes": "Auto-triggered by low stock alert",
            "approval": {
                "required": True,
                "approved_by": "user_123",
                "approved_at": datetime.now(),
                "approval_notes": "Approved for ordering"
            }
        }
        
        reorder_requests.create_index([("product_id", ASCENDING)])
        reorder_requests.create_index([("status", ASCENDING)])
        reorder_requests.create_index([("created_at", DESCENDING)])
        reorder_requests.create_index([("supplier_id", ASCENDING)])
        reorder_requests.create_index([("status", ASCENDING), ("created_at", DESCENDING)])
        
        # ====================================================================
        # 6. STOCK_TRANSACTIONS - Audit trail of all stock movements
        # ====================================================================
        
        if "stock_transactions" not in db.list_collection_names():
            db.create_collection("stock_transactions")
        
        stock_transactions = db.stock_transactions
        
        sample_transaction = {
            "_id": "txn_123456789",
            "product_id": "prod_123456789",
            "product_name": "Organic Tomatoes - 500g",
            "sku": "TOMATOE_ORG_500",
            "transaction_type": "SALE",  # SALE, RESTOCK, ADJUSTMENT, WASTE, TRANSFER
            "quantity": 2,
            "reference_id": "order_103",  # Links to order/reorder/etc
            "reference_type": "ORDER",  # ORDER, REORDER, MANUAL, WASTE
            "previous_stock": 50,
            "new_stock": 48,
            "timestamp": datetime.now(),
            "recorded_by": "user_456",
            "notes": "Sold with order 103",
            "batch_number": None,
            "expiry_date": None
        }
        
        stock_transactions.create_index([("product_id", ASCENDING), ("timestamp", DESCENDING)])
        stock_transactions.create_index([("transaction_type", ASCENDING)])
        stock_transactions.create_index([("reference_id", ASCENDING)])
        stock_transactions.create_index([("timestamp", DESCENDING)])
        
        # ====================================================================
        # 7. DEMAND_FORECAST - Predicted future demand
        # ====================================================================
        
        if "demand_forecast" not in db.list_collection_names():
            db.create_collection("demand_forecast")
        
        demand_forecast = db.demand_forecast
        
        sample_forecast = {
            "_id": "forecast_123456789",
            "product_id": "prod_123456789",
            "product_name": "Organic Tomatoes - 500g",
            "sku": "TOMATOE_ORG_500",
            "forecast_date": datetime.now(),
            "forecast_period": "WEEK",  # DAY, WEEK, MONTH
            "period_start": datetime.now(),
            "period_end": datetime.now(),
            "predicted_demand": 500,  # Units expected to sell
            "confidence_level": 0.85,  # 0-1 confidence in prediction
            "historical_avg": 480,  # Average from past data
            "trend": "INCREASING",  # STABLE, INCREASING, DECREASING
            "seasonality_factor": 1.1,
            "recommended_stock": 600,  # Recommended stock level
            "algorithm_used": "ARIMA",
            "factors_considered": [
                "historical_sales",
                "seasonality",
                "promotions",
                "events",
                "weather"
            ],
            "created_at": datetime.now()
        }
        
        demand_forecast.create_index([("product_id", ASCENDING)])
        demand_forecast.create_index([("forecast_date", DESCENDING)])
        demand_forecast.create_index([("product_id", ASCENDING), ("forecast_date", DESCENDING)])
        
        # ====================================================================
        # 8. INVENTORY_ANALYTICS - Aggregated metrics and KPIs
        # ====================================================================
        
        if "inventory_analytics" not in db.list_collection_names():
            db.create_collection("inventory_analytics")
        
        inventory_analytics = db.inventory_analytics
        
        sample_analytics = {
            "_id": "analytics_20260128",
            "date": datetime.now(),
            "period": "DAILY",  # DAILY, WEEKLY, MONTHLY
            # Stock-level metrics
            "total_products": 1250,
            "total_stock_value": 875000.00,  # Total value of all inventory
            "average_stock_per_product": 700,
            "products_in_stock": 1100,
            "out_of_stock_products": 50,
            "low_stock_products": 100,
            # Performance metrics
            "stock_turnover_ratio": 4.5,  # Times per year
            "days_inventory_outstanding": 81,  # Days inventory sits before sold
            "inventory_efficiency": 0.78,  # 0-1
            "fill_rate": 0.95,  # Percentage of demand fulfilled
            # Alert metrics
            "total_active_alerts": 15,
            "critical_alerts": 3,
            "high_alerts": 5,
            "medium_alerts": 7,
            # Reorder metrics
            "pending_reorders": 8,
            "avg_reorder_lead_time": 2.1,  # Days
            "reorder_accuracy": 0.92,  # Percentage of correct quantity
            # Waste metrics
            "waste_percentage": 0.05,
            "spoilage_loss": 2500.00,
            # Demand metrics
            "demand_forecast_accuracy": 0.88,
            "products_with_forecast": 1200,
            "top_5_best_sellers": [
                {"product_id": "prod_001", "quantity": 1200},
                {"product_id": "prod_002", "quantity": 980},
                {"product_id": "prod_003", "quantity": 850},
                {"product_id": "prod_004", "quantity": 720},
                {"product_id": "prod_005", "quantity": 650}
            ],
            "slow_moving_items": 45,
            "generated_at": datetime.now()
        }
        
        inventory_analytics.create_index([("date", DESCENDING)])
        inventory_analytics.create_index([("period", ASCENDING)])
        
        return {
            "products_inventory": products_inventory,
            "stock_levels": stock_levels,
            "low_stock_alerts": low_stock_alerts,
            "reorder_rules": reorder_rules,
            "reorder_requests": reorder_requests,
            "stock_transactions": stock_transactions,
            "demand_forecast": demand_forecast,
            "inventory_analytics": inventory_analytics
        }


# ============================================================================
# SAMPLE AGGREGATION PIPELINES FOR QUERIES
# ============================================================================

AGGREGATION_PIPELINES = {
    "low_stock_by_category": [
        {"$match": {"current_stock": {"$lte": "$reorder_level"}}},
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1},
            "total_stock": {"$sum": "$current_stock"}
        }},
        {"$sort": {"count": -1}}
    ],
    
    "stock_value_by_category": [
        {"$addFields": {"stock_value": {"$multiply": ["$current_stock", "$unit_price"]}}},
        {"$group": {
            "_id": "$category",
            "total_value": {"$sum": "$stock_value"},
            "product_count": {"$sum": 1}
        }},
        {"$sort": {"total_value": -1}}
    ],
    
    "top_movers": [
        {"$lookup": {
            "from": "stock_transactions",
            "localField": "_id",
            "foreignField": "product_id",
            "as": "transactions"
        }},
        {"$addFields": {"transaction_count": {"$size": "$transactions"}}},
        {"$sort": {"transaction_count": -1}},
        {"$limit": 20}
    ]
}

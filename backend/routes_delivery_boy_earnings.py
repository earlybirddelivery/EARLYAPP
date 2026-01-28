# Phase 1.5: Delivery Boy Routes - Earnings Dashboard & Performance
# REST endpoints for delivery boy earnings tracking and dashboard

from flask import Blueprint, request, jsonify
from datetime import datetime
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Initialize blueprint
delivery_boy_bp = Blueprint('delivery_boy', __name__, url_prefix='/api/delivery-boy')


def require_delivery_boy_role(f):
    """Decorator to require delivery_boy or admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import g
        
        if not hasattr(g, 'user') or not g.user:
            return jsonify({"error": "Unauthorized"}), 401
        
        role = g.user.get("role")
        user_id = g.user.get("id")
        
        if role not in ["delivery_boy", "admin"]:
            return jsonify({"error": "Only delivery boys can access this"}), 403
        
        # If delivery_boy, can only access own data unless admin
        if role == "delivery_boy" and user_id != kwargs.get("user_id"):
            return jsonify({"error": "Can only access own data"}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function


@delivery_boy_bp.route("/dashboard", methods=["GET"])
def get_dashboard():
    """
    GET /api/delivery-boy/dashboard
    
    Get delivery boy earnings dashboard (for admin).
    Shows top performers, statistics, etc.
    
    Returns:
    {
        "status": "success",
        "data": {
            "statistics": {
                "total_delivery_boys": 50,
                "active_count": 45,
                "lifetime": {
                    "total_deliveries": 15000,
                    "total_earnings": 750000,
                    "avg_per_boy": 15000
                },
                "today": {...},
                "week": {...},
                "month": {...}
            },
            "top_performers": [
                {
                    "id": "BOY_001",
                    "name": "Arjun Kumar",
                    "deliveries": 1250,
                    "earnings": 62500
                },
                ...
            ]
        }
    }
    """
    try:
        from flask import g
        
        # Check admin role
        if not hasattr(g, 'user') or g.user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        
        # Get database
        from database import get_db
        db = get_db()
        
        from earnings_tracker import EarningsTracker
        tracker = EarningsTracker(db)
        
        # Get statistics
        stats = db.delivery_boys.aggregate([
            {
                "$group": {
                    "_id": None,
                    "total_delivery_boys": {"$sum": 1},
                    "active_count": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", "active"]}, 1, 0]
                        }
                    },
                    "total_deliveries": {"$sum": "$total_deliveries"},
                    "total_earnings": {"$sum": "$total_earnings"},
                    "avg_earnings_per_boy": {"$avg": "$total_earnings"},
                    "today_deliveries": {"$sum": "$today_deliveries"},
                    "today_earnings": {"$sum": "$today_earnings"},
                    "week_deliveries": {"$sum": "$week_deliveries"},
                    "week_earnings": {"$sum": "$week_earnings"},
                    "month_deliveries": {"$sum": "$month_deliveries"},
                    "month_earnings": {"$sum": "$month_earnings"}
                }
            }
        ]).next() if db.delivery_boys.count_documents({}) > 0 else None
        
        statistics = {
            "total_delivery_boys": stats["total_delivery_boys"] if stats else 0,
            "active_count": stats["active_count"] if stats else 0,
            "lifetime": {
                "total_deliveries": stats["total_deliveries"] if stats else 0,
                "total_earnings": stats["total_earnings"] if stats else 0,
                "avg_per_boy": round(stats["avg_earnings_per_boy"] if stats else 0, 2)
            },
            "today": {
                "deliveries": stats["today_deliveries"] if stats else 0,
                "earnings": stats["today_earnings"] if stats else 0
            },
            "week": {
                "deliveries": stats["week_deliveries"] if stats else 0,
                "earnings": stats["week_earnings"] if stats else 0
            },
            "month": {
                "deliveries": stats["month_deliveries"] if stats else 0,
                "earnings": stats["month_earnings"] if stats else 0
            }
        }
        
        # Get top 10 performers this week
        top_performers = db.delivery_boys.find(
            {"status": "active"},
            {"_id": 0, "id": 1, "name": 1, "phone": 1, "week_deliveries": 1, "week_earnings": 1}
        ).sort("week_deliveries", -1).limit(10)
        
        top_performers_list = list(top_performers)
        
        return jsonify({
            "status": "success",
            "data": {
                "statistics": statistics,
                "top_performers": top_performers_list
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting delivery boy dashboard: {str(e)}")
        return jsonify({"error": str(e)}), 500


@delivery_boy_bp.route("/<delivery_boy_id>/earnings", methods=["GET"])
def get_earnings(delivery_boy_id: str):
    """
    GET /api/delivery-boy/{delivery_boy_id}/earnings
    
    Get delivery boy earnings summary.
    
    Returns:
    {
        "status": "success",
        "data": {
            "id": "BOY_001",
            "name": "Arjun Kumar",
            "today": {
                "deliveries": 12,
                "earnings": 600,
                "average_per_delivery": 50
            },
            "week": {
                "deliveries": 65,
                "earnings": 3250,
                "average_per_delivery": 50
            },
            "month": {
                "deliveries": 250,
                "earnings": 12500,
                "average_per_delivery": 50
            },
            "lifetime": {
                "deliveries": 1250,
                "earnings": 62500,
                "average_per_delivery": 50
            },
            "payment_info": {
                "last_payment_date": "2026-01-25",
                "last_payment_amount": 5000,
                "frequency": "weekly"
            }
        }
    }
    """
    try:
        from flask import g
        from database import get_db
        from earnings_tracker import EarningsTracker
        
        # Check authorization
        user = g.get("user")
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Allow delivery boy to view own data, admin to view all
        if user.get("role") == "delivery_boy":
            # Get their delivery_boy_id
            boy = get_db().delivery_boys.find_one(
                {"user_id": user.get("id")},
                {"_id": 0, "id": 1}
            )
            if not boy or boy["id"] != delivery_boy_id:
                return jsonify({"error": "Can only view own earnings"}), 403
        elif user.get("role") != "admin":
            return jsonify({"error": "Unauthorized"}), 403
        
        db = get_db()
        tracker = EarningsTracker(db)
        
        earnings_summary = tracker.get_earnings_summary(delivery_boy_id)
        
        if not earnings_summary:
            return jsonify({"error": "Delivery boy not found"}), 404
        
        return jsonify({
            "status": "success",
            "data": earnings_summary
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting earnings for {delivery_boy_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500


@delivery_boy_bp.route("/<delivery_boy_id>/history", methods=["GET"])
def get_earnings_history(delivery_boy_id: str):
    """
    GET /api/delivery-boy/{delivery_boy_id}/history
    
    Get detailed earnings history and payment details.
    
    Query params:
    - limit: Number of records to return (default: 50)
    - skip: Number of records to skip (default: 0)
    
    Returns:
    {
        "status": "success",
        "data": {
            "delivery_boy_id": "BOY_001",
            "total_records": 1250,
            "records": [
                {
                    "timestamp": "2026-01-28T10:30:00",
                    "type": "delivery",
                    "order_id": "ORD_001",
                    "amount": 50
                },
                {
                    "timestamp": "2026-01-28T18:00:00",
                    "type": "daily_bonus",
                    "amount": 100
                },
                ...
            ],
            "payment_history": [
                {
                    "date": "2026-01-25",
                    "amount": 5000,
                    "frequency": "weekly",
                    "status": "completed"
                },
                ...
            ]
        }
    }
    """
    try:
        from flask import g
        from database import get_db
        
        # Check authorization (same as get_earnings)
        user = g.get("user")
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        
        if user.get("role") == "delivery_boy":
            boy = get_db().delivery_boys.find_one(
                {"user_id": user.get("id")},
                {"_id": 0, "id": 1}
            )
            if not boy or boy["id"] != delivery_boy_id:
                return jsonify({"error": "Can only view own history"}), 403
        elif user.get("role") != "admin":
            return jsonify({"error": "Unauthorized"}), 403
        
        db = get_db()
        
        # Get pagination params
        limit = min(int(request.args.get("limit", 50)), 100)
        skip = int(request.args.get("skip", 0))
        
        # Get delivery boy
        boy = db.delivery_boys.find_one(
            {"id": delivery_boy_id},
            {"_id": 0, "earnings_history": 1, "total_earnings": 1}
        )
        
        if not boy:
            return jsonify({"error": "Delivery boy not found"}), 404
        
        # Get earnings history with pagination
        history = boy.get("earnings_history", [])
        total_records = len(history)
        
        # Sort by timestamp descending, then paginate
        sorted_history = sorted(
            history,
            key=lambda x: x.get("timestamp", ""),
            reverse=True
        )[skip:skip + limit]
        
        # Get payment history
        payments = db.delivery_boy_payments.find(
            {"delivery_boy_id": delivery_boy_id},
            {"_id": 0}
        ).sort("date", -1).limit(20)
        
        payment_history = list(payments)
        
        return jsonify({
            "status": "success",
            "data": {
                "delivery_boy_id": delivery_boy_id,
                "total_records": total_records,
                "total_earnings": boy.get("total_earnings", 0),
                "records": sorted_history,
                "payment_history": payment_history
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting earnings history: {str(e)}")
        return jsonify({"error": str(e)}), 500


@delivery_boy_bp.route("/batch/update-stats", methods=["POST"])
def batch_update_stats():
    """
    POST /api/delivery-boy/batch/update-stats
    
    Admin endpoint to update delivery stats from completed orders.
    Should be run as a cron job.
    
    Returns:
    {
        "status": "success",
        "data": {
            "updated_count": 45,
            "timestamp": "2026-01-28T10:30:00"
        }
    }
    """
    try:
        from flask import g
        from database import get_db
        from earnings_tracker import EarningsTracker
        
        # Check admin role
        user = g.get("user")
        if not user or user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        
        db = get_db()
        tracker = EarningsTracker(db)
        
        # Find all delivered orders from last 24 hours that haven't been counted yet
        from datetime import datetime, timedelta
        now = datetime.now()
        yesterday = now - timedelta(days=1)
        
        delivered_orders = db.orders.find({
            "status": "delivered",
            "delivery_status.delivered_at": {"$gte": yesterday},
            "earnings_recorded": {"$ne": True}
        })
        
        updated_count = 0
        for order in delivered_orders:
            try:
                delivery_boy_id = order.get("assigned_to")
                if delivery_boy_id:
                    # Record delivery
                    success = tracker.record_delivery(
                        delivery_boy_id,
                        order.get("id"),
                        amount_earned=50
                    )
                    
                    # Mark as processed
                    if success:
                        db.orders.update_one(
                            {"id": order.get("id")},
                            {"$set": {"earnings_recorded": True}}
                        )
                        updated_count += 1
            
            except Exception as e:
                logger.error(f"Error updating earnings for order {order.get('id')}: {str(e)}")
        
        logger.info(f"Updated earnings for {updated_count} delivery boys")
        
        return jsonify({
            "status": "success",
            "data": {
                "updated_count": updated_count,
                "timestamp": datetime.now().isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in batch update: {str(e)}")
        return jsonify({"error": str(e)}), 500


@delivery_boy_bp.route("/analytics/top-performers", methods=["GET"])
def get_top_performers():
    """
    GET /api/delivery-boy/analytics/top-performers
    
    Get top performing delivery boys.
    
    Query params:
    - period: "day", "week", "month" (default: "week")
    - limit: Number to return (default: 10)
    
    Returns:
    {
        "status": "success",
        "data": {
            "period": "week",
            "performers": [
                {
                    "rank": 1,
                    "id": "BOY_001",
                    "name": "Arjun Kumar",
                    "phone": "9876543210",
                    "deliveries": 65,
                    "earnings": 3250
                },
                ...
            ]
        }
    }
    """
    try:
        from flask import g
        from database import get_db
        
        # Check admin role
        user = g.get("user")
        if not user or user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        
        db = get_db()
        
        period = request.args.get("period", "week")
        if period not in ["day", "week", "month"]:
            return jsonify({"error": "Invalid period"}), 400
        
        limit = min(int(request.args.get("limit", 10)), 50)
        
        # Map period to field
        delivery_field = {
            "day": "today_deliveries",
            "week": "week_deliveries",
            "month": "month_deliveries"
        }[period]
        
        earnings_field = {
            "day": "today_earnings",
            "week": "week_earnings",
            "month": "month_earnings"
        }[period]
        
        # Get top performers
        performers = db.delivery_boys.find(
            {"status": "active"},
            {"_id": 0, "id": 1, "name": 1, "phone": 1, delivery_field: 1, earnings_field: 1}
        ).sort(delivery_field, -1).limit(limit)
        
        performers_list = list(performers)
        
        # Add rank
        for idx, perf in enumerate(performers_list, 1):
            perf["rank"] = idx
        
        return jsonify({
            "status": "success",
            "data": {
                "period": period,
                "performers": performers_list
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting top performers: {str(e)}")
        return jsonify({"error": str(e)}), 500


@delivery_boy_bp.route("/analytics/performance-summary", methods=["GET"])
def get_performance_summary():
    """
    GET /api/delivery-boy/analytics/performance-summary
    
    Get overall delivery system performance summary.
    
    Returns:
    {
        "status": "success",
        "data": {
            "active_delivery_boys": 45,
            "total_deliveries_today": 450,
            "total_earnings_today": 22500,
            "avg_earnings_per_boy_today": 500,
            "on_time_delivery_rate": 96.5,
            "customer_satisfaction": 4.7
        }
    }
    """
    try:
        from flask import g
        from database import get_db
        
        # Check admin role
        user = g.get("user")
        if not user or user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        
        db = get_db()
        
        # Get stats
        stats = db.delivery_boys.aggregate([
            {"$match": {"status": "active"}},
            {
                "$group": {
                    "_id": None,
                    "count": {"$sum": 1},
                    "today_deliveries": {"$sum": "$today_deliveries"},
                    "today_earnings": {"$sum": "$today_earnings"}
                }
            }
        ]).next() if db.delivery_boys.count_documents({"status": "active"}) > 0 else None
        
        # Get on-time delivery rate
        total_deliveries = db.orders.count_documents({"status": "delivered"})
        on_time_deliveries = db.orders.count_documents({
            "status": "delivered",
            "delivery_status.on_time": True
        })
        
        on_time_rate = (on_time_deliveries / total_deliveries * 100) if total_deliveries > 0 else 0
        
        # Get customer satisfaction (from order ratings)
        ratings = db.orders.aggregate([
            {"$match": {"status": "delivered", "rating": {"$exists": True}}},
            {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
        ]).next() if db.orders.count_documents({"status": "delivered", "rating": {"$exists": True}}) > 0 else None
        
        avg_rating = ratings["avg_rating"] if ratings else 0
        
        return jsonify({
            "status": "success",
            "data": {
                "active_delivery_boys": stats["count"] if stats else 0,
                "total_deliveries_today": stats["today_deliveries"] if stats else 0,
                "total_earnings_today": stats["today_earnings"] if stats else 0,
                "avg_earnings_per_boy_today": round(
                    (stats["today_earnings"] / stats["count"]) if stats and stats["count"] > 0 else 0, 2
                ),
                "on_time_delivery_rate": round(on_time_rate, 1),
                "customer_satisfaction": round(avg_rating, 1)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting performance summary: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Export
__all__ = ["delivery_boy_bp"]

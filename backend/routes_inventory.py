"""
PHASE 4B.4: Inventory Monitoring - REST API Routes
14 endpoints for inventory management, alerts, reorders, and analytics
"""

from flask import Blueprint, request, jsonify
from functools import wraps
from datetime import datetime
import logging
from inventory_service import InventoryService

logger = logging.getLogger(__name__)

# ============================================================================
# BLUEPRINT & CONFIGURATION
# ============================================================================

inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')

# Global service instance
_inventory_service = None


def require_auth(f):
    """Decorator to require JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        # In production, verify JWT token
        request.user_id = "user_123"  # Extract from token
        return f(*args, **kwargs)
    return decorated_function


def require_admin(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check admin role - in production, verify against JWT claims
        if request.headers.get('X-Admin-Key') != 'admin_token':
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated_function


def _get_inventory_service(db):
    """Get or create inventory service instance"""
    global _inventory_service
    if _inventory_service is None:
        _inventory_service = InventoryService(db)
    return _inventory_service


def init_inventory_routes(app, db):
    """Initialize inventory routes with database connection"""
    global _inventory_service
    _inventory_service = InventoryService(db)
    app.register_blueprint(inventory_bp)
    logger.info("Inventory routes initialized")


# ============================================================================
# 1. PRODUCT STOCK MANAGEMENT ENDPOINTS
# ============================================================================

@inventory_bp.route('/products/<product_id>/stock', methods=['GET'])
@require_auth
def get_product_stock(product_id):
    """GET /api/inventory/products/{product_id}/stock - Get current stock"""
    try:
        service = _inventory_service
        product = service.get_product_stock(product_id)
        
        if not product:
            return jsonify({"error": "Product not found"}), 404
        
        return jsonify({
            "success": True,
            "product": product
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting product stock: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/products/<product_id>/stock', methods=['PUT'])
@require_auth
def update_product_stock(product_id):
    """PUT /api/inventory/products/{product_id}/stock - Update stock level"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ['quantity_change', 'transaction_type', 'reference_id']
        if not all(field in data for field in required):
            return jsonify({"error": "Missing required fields"}), 400
        
        service = _inventory_service
        result = service.update_stock(
            product_id=product_id,
            quantity_change=data.get('quantity_change'),
            transaction_type=data.get('transaction_type'),
            reference_id=data.get('reference_id'),
            recorded_by=request.user_id,
            notes=data.get('notes')
        )
        
        return jsonify({
            "success": True,
            "data": result
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating stock: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/products/low-stock', methods=['GET'])
@require_auth
def get_low_stock_products():
    """GET /api/inventory/products/low-stock - Get all low stock products"""
    try:
        service = _inventory_service
        limit = request.args.get('limit', default=100, type=int)
        
        products = service.get_low_stock_products(limit=limit)
        
        return jsonify({
            "success": True,
            "count": len(products),
            "products": products
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting low stock products: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/products/out-of-stock', methods=['GET'])
@require_auth
def get_out_of_stock_products():
    """GET /api/inventory/products/out-of-stock - Get all out of stock products"""
    try:
        service = _inventory_service
        products = service.get_out_of_stock_products()
        
        return jsonify({
            "success": True,
            "count": len(products),
            "products": products
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting out of stock products: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# 2. ALERT MANAGEMENT ENDPOINTS
# ============================================================================

@inventory_bp.route('/alerts', methods=['GET'])
@require_auth
def get_active_alerts():
    """GET /api/inventory/alerts - Get all active alerts"""
    try:
        service = _inventory_service
        alerts = service.get_active_alerts()
        
        return jsonify({
            "success": True,
            "count": len(alerts),
            "alerts": alerts
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting alerts: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/alerts/<alert_id>/acknowledge', methods=['PUT'])
@require_auth
def acknowledge_alert(alert_id):
    """PUT /api/inventory/alerts/{alert_id}/acknowledge - Acknowledge alert"""
    try:
        data = request.get_json()
        service = _inventory_service
        
        result = service.acknowledge_alert(
            alert_id=alert_id,
            acknowledged_by=request.user_id,
            comment=data.get('comment')
        )
        
        return jsonify({
            "success": True,
            "data": result
        }), 200
        
    except Exception as e:
        logger.error(f"Error acknowledging alert: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/alerts/<alert_id>/resolve', methods=['PUT'])
@require_auth
@require_admin
def resolve_alert(alert_id):
    """PUT /api/inventory/alerts/{alert_id}/resolve - Resolve alert"""
    try:
        data = request.get_json()
        
        if 'action_taken' not in data:
            return jsonify({"error": "action_taken required"}), 400
        
        service = _inventory_service
        result = service.resolve_alert(
            alert_id=alert_id,
            resolved_by=request.user_id,
            action_taken=data.get('action_taken')
        )
        
        return jsonify({
            "success": True,
            "data": result
        }), 200
        
    except Exception as e:
        logger.error(f"Error resolving alert: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# 3. REORDER MANAGEMENT ENDPOINTS
# ============================================================================

@inventory_bp.route('/reorder-rules/<product_id>', methods=['POST'])
@require_auth
@require_admin
def create_reorder_rule(product_id):
    """POST /api/inventory/reorder-rules/{product_id} - Create reorder rule"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ['supplier_id', 'reorder_level', 'reorder_quantity', 'lead_time_days']
        if not all(field in data for field in required):
            return jsonify({"error": "Missing required fields"}), 400
        
        service = _inventory_service
        rule = service.create_reorder_rule(
            product_id=product_id,
            supplier_id=data.get('supplier_id'),
            reorder_level=data.get('reorder_level'),
            reorder_quantity=data.get('reorder_quantity'),
            lead_time_days=data.get('lead_time_days'),
            created_by=request.user_id
        )
        
        return jsonify({
            "success": True,
            "rule": rule
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating reorder rule: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/reorder-requests', methods=['POST'])
@require_auth
def create_reorder_request():
    """POST /api/inventory/reorder-requests - Create reorder request"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ['product_id', 'quantity', 'trigger_reason']
        if not all(field in data for field in required):
            return jsonify({"error": "Missing required fields"}), 400
        
        service = _inventory_service
        reorder = service.create_reorder_request(
            product_id=data.get('product_id'),
            quantity=data.get('quantity'),
            trigger_reason=data.get('trigger_reason'),
            triggered_by=request.user_id
        )
        
        return jsonify({
            "success": True,
            "reorder": reorder
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating reorder request: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/reorder-requests/pending', methods=['GET'])
@require_auth
def get_pending_reorders():
    """GET /api/inventory/reorder-requests/pending - Get pending reorders"""
    try:
        service = _inventory_service
        reorders = service.get_pending_reorders()
        
        return jsonify({
            "success": True,
            "count": len(reorders),
            "reorders": reorders
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting pending reorders: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/reorder-requests/<reorder_id>/approve', methods=['PUT'])
@require_auth
@require_admin
def approve_reorder(reorder_id):
    """PUT /api/inventory/reorder-requests/{reorder_id}/approve - Approve reorder"""
    try:
        service = _inventory_service
        result = service.approve_reorder(
            reorder_id=reorder_id,
            approved_by=request.user_id
        )
        
        return jsonify({
            "success": True,
            "data": result
        }), 200
        
    except Exception as e:
        logger.error(f"Error approving reorder: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/reorder-requests/<reorder_id>/receive', methods=['PUT'])
@require_auth
def receive_reorder(reorder_id):
    """PUT /api/inventory/reorder-requests/{reorder_id}/receive - Mark reorder received"""
    try:
        data = request.get_json()
        
        if 'quantity_received' not in data:
            return jsonify({"error": "quantity_received required"}), 400
        
        service = _inventory_service
        result = service.receive_reorder(
            reorder_id=reorder_id,
            quantity_received=data.get('quantity_received'),
            received_by=request.user_id,
            notes=data.get('notes')
        )
        
        return jsonify({
            "success": True,
            "data": result
        }), 200
        
    except Exception as e:
        logger.error(f"Error receiving reorder: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# 4. FORECASTING & ANALYTICS ENDPOINTS
# ============================================================================

@inventory_bp.route('/forecast/<product_id>', methods=['GET'])
@require_auth
def get_demand_forecast(product_id):
    """GET /api/inventory/forecast/{product_id} - Get demand forecast"""
    try:
        service = _inventory_service
        forecast = service.get_forecast(product_id)
        
        if not forecast:
            # Calculate if not exists
            forecast = service.calculate_demand_forecast(product_id)
        
        return jsonify({
            "success": True,
            "forecast": forecast
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting forecast: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/forecast/<product_id>/calculate', methods=['POST'])
@require_auth
def calculate_forecast(product_id):
    """POST /api/inventory/forecast/{product_id}/calculate - Calculate forecast"""
    try:
        data = request.get_json() or {}
        service = _inventory_service
        
        forecast = service.calculate_demand_forecast(
            product_id=product_id,
            historical_days=data.get('historical_days', 90)
        )
        
        return jsonify({
            "success": True,
            "forecast": forecast
        }), 201
        
    except Exception as e:
        logger.error(f"Error calculating forecast: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/analytics', methods=['GET'])
@require_auth
def get_analytics():
    """GET /api/inventory/analytics - Get inventory analytics"""
    try:
        service = _inventory_service
        analytics = service.calculate_inventory_analytics()
        
        return jsonify({
            "success": True,
            "analytics": analytics
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/by-category', methods=['GET'])
@require_auth
def get_stock_by_category():
    """GET /api/inventory/by-category - Get stock by category"""
    try:
        service = _inventory_service
        categories = service.get_stock_by_category()
        
        return jsonify({
            "success": True,
            "count": len(categories),
            "categories": categories
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting stock by category: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/dashboard', methods=['GET'])
@require_auth
def get_dashboard_summary():
    """GET /api/inventory/dashboard - Get dashboard summary"""
    try:
        service = _inventory_service
        summary = service.get_dashboard_summary()
        
        return jsonify({
            "success": True,
            "data": summary
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {str(e)}")
        return jsonify({"error": str(e)}), 500


@inventory_bp.route('/health', methods=['GET'])
def health_check():
    """GET /api/inventory/health - Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "inventory",
        "timestamp": datetime.now().isoformat()
    }), 200


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@inventory_bp.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@inventory_bp.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

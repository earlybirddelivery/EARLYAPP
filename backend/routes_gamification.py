"""
Gamification REST API Routes
File: backend/routes_gamification.py
Purpose: Flask Blueprint endpoints for gamification features
Lines: 500+
Endpoints: 15+ REST endpoints
"""

from flask import Blueprint, request, jsonify
from functools import wraps
from datetime import datetime
from gamification_service import (
    LoyaltyPointsService,
    LeaderboardService,
    AchievementsService
)

# Create Blueprint
gamification_bp = Blueprint('gamification', __name__, url_prefix='/api/gamification')

# Services (initialize with database)
def get_services(db):
    return {
        'loyalty': LoyaltyPointsService(db),
        'leaderboard': LeaderboardService(db),
        'achievements': AchievementsService(db)
    }

# Authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        # Token validation logic here
        return f(*args, **kwargs)
    return decorated

# Helper to get customer ID from token
def get_customer_id():
    # Extract from JWT token
    return request.headers.get('X-Customer-Id', '')


# ==================== LOYALTY POINTS ENDPOINTS ====================

@gamification_bp.route('/points/balance', methods=['GET'])
@require_auth
def get_points_balance():
    """Get customer's loyalty points balance and tier."""
    try:
        customer_id = get_customer_id()
        from database import get_db
        db = get_db()
        
        loyalty = LoyaltyPointsService(db)
        points = loyalty.get_customer_points(customer_id)
        
        return jsonify({
            'status': 'success',
            'data': points,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@gamification_bp.route('/points/history', methods=['GET'])
@require_auth
def get_points_history():
    """Get customer's points transaction history."""
    try:
        customer_id = get_customer_id()
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        from database import get_db
        db = get_db()
        
        transactions = list(db.points_transactions.find(
            {'customer_id': customer_id}
        ).sort('created_at', -1).skip(offset).limit(limit))
        
        # Format response
        history = []
        for tx in transactions:
            history.append({
                'transaction_id': tx.get('transaction_id'),
                'points': tx.get('points'),
                'reason': tx.get('reason'),
                'metadata': tx.get('metadata', {}),
                'created_at': tx.get('created_at')
            })
        
        return jsonify({
            'status': 'success',
            'data': {
                'transactions': history,
                'total': db.points_transactions.count_documents({'customer_id': customer_id}),
                'limit': limit,
                'offset': offset
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@gamification_bp.route('/points/redeem', methods=['POST'])
@require_auth
def redeem_points():
    """Redeem loyalty points for discount voucher."""
    try:
        customer_id = get_customer_id()
        data = request.json
        points_to_redeem = data.get('points', 0)
        
        from database import get_db
        db = get_db()
        
        loyalty = LoyaltyPointsService(db)
        result = loyalty.redeem_points(customer_id, points_to_redeem)
        
        if not result['success']:
            return jsonify({
                'status': 'error',
                'message': result.get('error')
            }), 400
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@gamification_bp.route('/points/tier-info', methods=['GET'])
@require_auth
def get_tier_info():
    """Get detailed tier information and benefits."""
    tier = request.args.get('tier', 'BRONZE')
    
    tier_benefits = {
        'BRONZE': {
            'name': 'Bronze',
            'emoji': '🥉',
            'points_required': 0,
            'benefits': [
                '1 point per ₹1 spent',
                'Access to basic deals',
                'Monthly newsletter'
            ],
            'points_multiplier': 1.0
        },
        'SILVER': {
            'name': 'Silver',
            'emoji': '🥈',
            'points_required': 500,
            'benefits': [
                '1.1x points multiplier',
                'Early access to sales',
                'Priority support',
                '₹50 birthday bonus'
            ],
            'points_multiplier': 1.1
        },
        'GOLD': {
            'name': 'Gold',
            'emoji': '🥇',
            'points_required': 1500,
            'benefits': [
                '1.2x points multiplier',
                'Exclusive GOLD deals',
                '24/7 priority support',
                '₹100 birthday bonus',
                'Free shipping on select items'
            ],
            'points_multiplier': 1.2
        },
        'PLATINUM': {
            'name': 'Platinum',
            'emoji': '💍',
            'points_required': 3500,
            'benefits': [
                '1.3x points multiplier',
                'Exclusive PLATINUM events',
                'Personal account manager',
                '₹200 birthday bonus',
                'Free shipping on all orders',
                'Early access to new products'
            ],
            'points_multiplier': 1.3
        },
        'DIAMOND': {
            'name': 'Diamond',
            'emoji': '👑',
            'points_required': 7000,
            'benefits': [
                '1.5x points multiplier',
                'VIP exclusive events',
                'Dedicated concierge',
                '₹500 birthday bonus',
                'Free shipping & express delivery',
                'Invitation to annual gala',
                'Premium product samples'
            ],
            'points_multiplier': 1.5
        }
    }
    
    tier_data = tier_benefits.get(tier)
    if not tier_data:
        return jsonify({'status': 'error', 'message': 'Invalid tier'}), 400
    
    return jsonify({
        'status': 'success',
        'data': tier_data
    }), 200


# ==================== LEADERBOARD ENDPOINTS ====================

@gamification_bp.route('/leaderboard/global', methods=['GET'])
def get_global_leaderboard():
    """Get global overall points leaderboard."""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # Validate limits
        limit = min(limit, 500)
        offset = max(offset, 0)
        
        from database import get_db
        db = get_db()
        
        leaderboard = LeaderboardService(db)
        result = leaderboard.get_global_leaderboard(limit, offset)
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@gamification_bp.route('/leaderboard/tier/<tier>', methods=['GET'])
def get_tier_leaderboard(tier):
    """Get tier-specific leaderboard."""
    try:
        valid_tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']
        if tier not in valid_tiers:
            return jsonify({'status': 'error', 'message': 'Invalid tier'}), 400
        
        limit = request.args.get('limit', 50, type=int)
        
        from database import get_db
        db = get_db()
        
        leaderboard = LeaderboardService(db)
        result = leaderboard.get_tier_leaderboard(tier, limit)
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@gamification_bp.route('/leaderboard/weekly', methods=['GET'])
def get_weekly_leaderboard():
    """Get weekly points leaderboard."""
    try:
        limit = request.args.get('limit', 50, type=int)
        
        from database import get_db
        db = get_db()
        
        leaderboard = LeaderboardService(db)
        result = leaderboard.get_weekly_leaderboard(limit)
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@gamification_bp.route('/leaderboard/rank', methods=['GET'])
@require_auth
def get_customer_rank():
    """Get customer's current rank in leaderboard."""
    try:
        customer_id = get_customer_id()
        
        from database import get_db
        db = get_db()
        
        leaderboard = LeaderboardService(db)
        result = leaderboard.get_customer_rank(customer_id)
        
        if 'error' in result:
            return jsonify({'status': 'error', 'message': result['error']}), 404
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ==================== ACHIEVEMENTS ENDPOINTS ====================

@gamification_bp.route('/achievements', methods=['GET'])
@require_auth
def get_achievements():
    """Get all achievements for customer."""
    try:
        customer_id = get_customer_id()
        
        from database import get_db
        db = get_db()
        
        achievements = AchievementsService(db)
        result = achievements.get_customer_achievements(customer_id)
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@gamification_bp.route('/achievements/unlock/<achievement_id>', methods=['POST'])
@require_auth
def unlock_achievement(achievement_id):
    """Unlock achievement for customer."""
    try:
        customer_id = get_customer_id()
        
        from database import get_db
        db = get_db()
        
        achievements = AchievementsService(db)
        result = achievements.unlock_achievement(customer_id, achievement_id)
        
        if not result['success']:
            return jsonify({'status': 'error', 'message': result.get('error')}), 400
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@gamification_bp.route('/achievements/check', methods=['POST'])
@require_auth
def check_achievements():
    """Check and auto-unlock eligible achievements."""
    try:
        customer_id = get_customer_id()
        
        from database import get_db
        db = get_db()
        
        achievements = AchievementsService(db)
        newly_unlocked = achievements.check_and_unlock_achievements(customer_id)
        
        return jsonify({
            'status': 'success',
            'data': {
                'newly_unlocked': newly_unlocked,
                'count': len(newly_unlocked)
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@gamification_bp.route('/achievements/list', methods=['GET'])
def get_all_achievements():
    """Get list of all possible achievements in system."""
    try:
        from database import get_db
        db = get_db()
        
        achievements = AchievementsService(db)
        
        achievement_list = []
        for ach_id, ach_data in achievements.ACHIEVEMENTS.items():
            achievement_list.append({
                'achievement_id': ach_id,
                'name': ach_data['name'],
                'description': ach_data['description'],
                'icon': ach_data['icon'],
                'points': ach_data['points'],
                'category': ach_data.get('category', 'general')
            })
        
        return jsonify({
            'status': 'success',
            'data': {
                'achievements': achievement_list,
                'total': len(achievement_list)
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ==================== GAMIFICATION DASHBOARD ENDPOINTS ====================

@gamification_bp.route('/dashboard/overview', methods=['GET'])
@require_auth
def get_gamification_overview():
    """Get comprehensive gamification dashboard overview."""
    try:
        customer_id = get_customer_id()
        
        from database import get_db
        db = get_db()
        
        loyalty = LoyaltyPointsService(db)
        leaderboard = LeaderboardService(db)
        achievements = AchievementsService(db)
        
        # Get all data
        points_data = loyalty.get_customer_points(customer_id)
        rank_data = leaderboard.get_customer_rank(customer_id)
        achievements_data = achievements.get_customer_achievements(customer_id)
        
        return jsonify({
            'status': 'success',
            'data': {
                'points': points_data,
                'rank': rank_data,
                'achievements': {
                    'unlocked_count': achievements_data['unlocked_count'],
                    'total': achievements_data['total_achievements'],
                    'badge_points': achievements_data['total_badge_points'],
                    'recently_unlocked': achievements_data['unlocked'][:5]
                }
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@gamification_bp.route('/dashboard/progress', methods=['GET'])
@require_auth
def get_progress_summary():
    """Get customer's progress towards next tier and goals."""
    try:
        customer_id = get_customer_id()
        
        from database import get_db
        db = get_db()
        
        loyalty = LoyaltyPointsService(db)
        
        points_data = loyalty.get_customer_points(customer_id)
        
        return jsonify({
            'status': 'success',
            'data': {
                'current_tier': points_data['tier'],
                'tier_progress': points_data['tier_progress'],
                'points_to_next_tier': points_data['points_to_next_tier'],
                'current_points': points_data['total_points'],
                'lifetime_points': points_data['lifetime_points']
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ==================== ANALYTICS & ADMIN ENDPOINTS ====================

@gamification_bp.route('/analytics/top-customers', methods=['GET'])
def get_top_customers():
    """Get top 100 customers by points (admin endpoint)."""
    try:
        # Verify admin token
        auth_header = request.headers.get('Authorization', '')
        if 'admin-' not in auth_header:
            return jsonify({'status': 'error', 'message': 'Admin access required'}), 403
        
        from database import get_db
        db = get_db()
        
        leaderboard = LeaderboardService(db)
        result = leaderboard.get_global_leaderboard(100, 0)
        
        return jsonify({
            'status': 'success',
            'data': result['leaderboard']
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@gamification_bp.route('/analytics/tier-distribution', methods=['GET'])
def get_tier_distribution():
    """Get distribution of customers across tiers."""
    try:
        from database import get_db
        db = get_db()
        
        tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']
        distribution = {}
        
        total = db.customer_points.count_documents({})
        
        for tier in tiers:
            count = db.customer_points.count_documents({'tier': tier})
            distribution[tier] = {
                'count': count,
                'percentage': (count / total * 100) if total > 0 else 0
            }
        
        return jsonify({
            'status': 'success',
            'data': {
                'distribution': distribution,
                'total_customers': total
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ==================== UTILITY ENDPOINTS ====================

@gamification_bp.route('/health', methods=['GET'])
def gamification_health():
    """Check gamification service health."""
    return jsonify({
        'status': 'healthy',
        'service': 'gamification',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@gamification_bp.route('/stats', methods=['GET'])
def get_gamification_stats():
    """Get overall gamification statistics."""
    try:
        from database import get_db
        db = get_db()
        
        total_customers = db.customer_points.count_documents({})
        total_points_distributed = db.customer_points.aggregate([
            {'$group': {'_id': None, 'total': {'$sum': '$lifetime_points'}}}
        ])
        total_points = list(total_points_distributed)[0]['total'] if total_points_distributed else 0
        
        return jsonify({
            'status': 'success',
            'data': {
                'total_gamified_customers': total_customers,
                'total_points_distributed': total_points,
                'avg_points_per_customer': int(total_points / total_customers) if total_customers > 0 else 0,
                'timestamp': datetime.utcnow().isoformat()
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ==================== ERROR HANDLERS ====================

@gamification_bp.errorhandler(404)
def not_found(e):
    return jsonify({'status': 'error', 'message': 'Endpoint not found'}), 404

@gamification_bp.errorhandler(500)
def internal_error(e):
    return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

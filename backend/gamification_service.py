"""
Gamification Service - Loyalty Points, Leaderboards, and Achievements
File: backend/gamification_service.py
Purpose: Core gamification engine for customer engagement
Lines: 850+
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import math
from pymongo import ASCENDING, DESCENDING


class LoyaltyPointsService:
    """
    Manages customer loyalty points system.
    Points earned through orders, referrals, activities, and achievements.
    """
    
    def __init__(self, db):
        """Initialize with MongoDB database connection"""
        self.db = db
        self.POINTS_CONFIG = {
            'order_per_rupee': 1,           # 1 point per ₹1 spent
            'referral_signup': 100,         # 100 points for referral signup
            'referral_purchase': 50,        # 50 points when referral makes purchase
            'review_submission': 25,        # 25 points for product review
            'first_order_bonus': 150,       # 150 points for first order
            'birthday_bonus': 200,          # 200 points on birthday
            'subscription': 5,              # 5 points per subscription order
            'repeat_customer': 75,          # 75 points after 10th order
            'high_rating': 50,              # 50 points for rating >=4.5
            'referral_bonus_tier': {        # Tiered referral bonuses
                5: 100,   # 100 extra at 5 referrals
                10: 250,  # 250 extra at 10 referrals
                20: 500   # 500 extra at 20 referrals
            }
        }
        self.REDEMPTION_VALUE = 0.5  # 1 point = ₹0.50
    
    def get_customer_points(self, customer_id: str) -> Dict:
        """
        Get current points balance and tier for customer.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            {
                'total_points': int,
                'available_points': int,
                'tier': str,
                'tier_progress': float,
                'points_to_next_tier': int,
                'lifetime_points': int,
                'last_updated': datetime
            }
        """
        record = self.db.customer_points.find_one({'customer_id': customer_id})
        
        if not record:
            # Initialize new customer record
            self.db.customer_points.insert_one({
                'customer_id': customer_id,
                'total_points': 0,
                'available_points': 0,
                'redeemed_points': 0,
                'tier': 'BRONZE',
                'tier_upgraded_at': datetime.utcnow(),
                'lifetime_points': 0,
                'created_at': datetime.utcnow(),
                'last_updated': datetime.utcnow()
            })
            return {
                'total_points': 0,
                'available_points': 0,
                'tier': 'BRONZE',
                'tier_progress': 0.0,
                'points_to_next_tier': 500,
                'lifetime_points': 0,
                'last_updated': datetime.utcnow()
            }
        
        tier, tier_progress, points_to_next = self._calculate_tier(record['total_points'])
        
        return {
            'total_points': record['total_points'],
            'available_points': record['available_points'],
            'tier': tier,
            'tier_progress': tier_progress,
            'points_to_next_tier': points_to_next,
            'lifetime_points': record['lifetime_points'],
            'last_updated': record['last_updated']
        }
    
    def _calculate_tier(self, points: int) -> Tuple[str, float, int]:
        """
        Calculate customer tier based on points.
        Tiers: BRONZE (0), SILVER (500), GOLD (1500), PLATINUM (3500), DIAMOND (7000)
        
        Args:
            points: Current point balance
            
        Returns:
            (tier_name, progress_to_next_tier, points_needed_for_next)
        """
        tiers = {
            'BRONZE': (0, 500),
            'SILVER': (500, 1500),
            'GOLD': (1500, 3500),
            'PLATINUM': (3500, 7000),
            'DIAMOND': (7000, float('inf'))
        }
        
        current_tier = 'BRONZE'
        tier_min = 0
        tier_max = 500
        
        for tier_name, (min_pts, max_pts) in tiers.items():
            if points >= min_pts:
                current_tier = tier_name
                tier_min = min_pts
                tier_max = max_pts
        
        if tier_max == float('inf'):
            return current_tier, 1.0, 0
        
        progress = (points - tier_min) / (tier_max - tier_min) if tier_max > tier_min else 0
        points_to_next = max(0, tier_max - points)
        
        return current_tier, min(progress, 1.0), points_to_next
    
    def add_points(self, customer_id: str, points: int, reason: str, metadata: Dict = None) -> Dict:
        """
        Add points to customer account with reason tracking.
        
        Args:
            customer_id: Customer ID
            points: Number of points to add
            reason: Reason for points (order, referral, review, etc.)
            metadata: Additional metadata for tracking
            
        Returns:
            {
                'success': bool,
                'new_balance': int,
                'points_added': int,
                'tier_changed': bool,
                'new_tier': str,
                'transaction_id': str
            }
        """
        if points <= 0:
            return {'success': False, 'error': 'Points must be positive'}
        
        transaction_id = f"PT_{customer_id}_{datetime.utcnow().timestamp()}"
        
        # Record transaction
        self.db.points_transactions.insert_one({
            'transaction_id': transaction_id,
            'customer_id': customer_id,
            'points': points,
            'reason': reason,
            'metadata': metadata or {},
            'created_at': datetime.utcnow()
        })
        
        # Update customer record
        result = self.db.customer_points.find_one_and_update(
            {'customer_id': customer_id},
            {
                '$inc': {
                    'total_points': points,
                    'available_points': points,
                    'lifetime_points': points
                },
                '$set': {'last_updated': datetime.utcnow()}
            },
            return_document=True
        )
        
        if not result:
            self.get_customer_points(customer_id)  # Initialize
            result = self.db.customer_points.find_one({'customer_id': customer_id})
        
        old_tier = result.get('tier', 'BRONZE')
        new_tier, _, _ = self._calculate_tier(result['total_points'] + points)
        tier_changed = old_tier != new_tier
        
        if tier_changed:
            self.db.customer_points.update_one(
                {'customer_id': customer_id},
                {
                    '$set': {
                        'tier': new_tier,
                        'tier_upgraded_at': datetime.utcnow()
                    }
                }
            )
        
        return {
            'success': True,
            'new_balance': result['available_points'] + points,
            'points_added': points,
            'tier_changed': tier_changed,
            'new_tier': new_tier,
            'transaction_id': transaction_id
        }
    
    def redeem_points(self, customer_id: str, points_to_redeem: int) -> Dict:
        """
        Redeem loyalty points for discount.
        
        Args:
            customer_id: Customer ID
            points_to_redeem: Points to convert to discount
            
        Returns:
            {
                'success': bool,
                'discount_amount': float,
                'remaining_points': int,
                'voucher_code': str
            }
        """
        customer = self.db.customer_points.find_one({'customer_id': customer_id})
        
        if not customer:
            return {'success': False, 'error': 'Customer not found'}
        
        if customer['available_points'] < points_to_redeem:
            return {
                'success': False,
                'error': f"Insufficient points. Available: {customer['available_points']}"
            }
        
        discount_amount = points_to_redeem * self.REDEMPTION_VALUE
        
        # Create redemption record
        voucher_code = f"VCH_{customer_id}_{datetime.utcnow().timestamp()}".replace('.', '')
        
        self.db.points_redemptions.insert_one({
            'customer_id': customer_id,
            'points_redeemed': points_to_redeem,
            'discount_amount': discount_amount,
            'voucher_code': voucher_code,
            'status': 'ACTIVE',
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(days=30)
        })
        
        # Update customer points
        self.db.customer_points.update_one(
            {'customer_id': customer_id},
            {
                '$inc': {
                    'available_points': -points_to_redeem,
                    'redeemed_points': points_to_redeem
                }
            }
        )
        
        return {
            'success': True,
            'discount_amount': discount_amount,
            'remaining_points': customer['available_points'] - points_to_redeem,
            'voucher_code': voucher_code
        }
    
    def calculate_order_points(self, order_id: str, order_data: Dict) -> int:
        """
        Calculate points earned from an order.
        Considers order value, customer tier, and first-order bonus.
        
        Args:
            order_id: Order ID
            order_data: Order details {total_amount, customer_id, items}
            
        Returns:
            Points earned
        """
        customer_id = order_data.get('customer_id')
        total_amount = order_data.get('total_amount', 0)
        
        # Base points: 1 point per rupee
        base_points = int(total_amount * self.POINTS_CONFIG['order_per_rupee'])
        
        # Check if first order
        order_count = self.db.orders.count_documents({'customer_id': customer_id})
        if order_count == 0:
            base_points += self.POINTS_CONFIG['first_order_bonus']
        
        # Check subscription bonus
        if order_data.get('order_type') == 'subscription':
            base_points += self.POINTS_CONFIG['subscription']
        
        # Customer tier multiplier (higher tier = more points)
        customer_points = self.get_customer_points(customer_id)
        tier_multipliers = {
            'BRONZE': 1.0,
            'SILVER': 1.1,
            'GOLD': 1.2,
            'PLATINUM': 1.3,
            'DIAMOND': 1.5
        }
        multiplier = tier_multipliers.get(customer_points['tier'], 1.0)
        
        return int(base_points * multiplier)


class LeaderboardService:
    """
    Manages leaderboard rankings and statistics.
    Tracks customer rankings by points, tier, and various metrics.
    """
    
    def __init__(self, db):
        """Initialize with MongoDB database connection"""
        self.db = db
        self.LEADERBOARD_TYPES = {
            'overall': 'Overall points ranking',
            'weekly': 'Weekly points earned',
            'monthly': 'Monthly points earned',
            'tier': 'Tier-specific ranking',
            'referrals': 'Most successful referrer'
        }
    
    def get_global_leaderboard(self, limit: int = 100, offset: int = 0) -> Dict:
        """
        Get global overall points leaderboard.
        
        Args:
            limit: Number of entries to return
            offset: Pagination offset
            
        Returns:
            {
                'leaderboard': [
                    {
                        'rank': int,
                        'customer_id': str,
                        'name': str,
                        'points': int,
                        'tier': str,
                        'tier_emoji': str,
                        'badge_count': int
                    }
                ],
                'total_participants': int,
                'user_rank': int (if authenticated)
            }
        """
        pipeline = [
            {'$sort': {'total_points': DESCENDING}},
            {'$skip': offset},
            {'$limit': limit},
            {'$lookup': {
                'from': 'customers_v2',
                'localField': 'customer_id',
                'foreignField': '_id',
                'as': 'customer'
            }},
            {'$unwind': '$customer'},
            {'$project': {
                'customer_id': 1,
                'total_points': 1,
                'tier': 1,
                'name': '$customer.name',
                'phone': '$customer.phone'
            }}
        ]
        
        results = list(self.db.customer_points.aggregate(pipeline))
        
        # Add rank and tier emoji
        tier_emojis = {
            'BRONZE': '🥉',
            'SILVER': '🥈',
            'GOLD': '🥇',
            'PLATINUM': '💎',
            'DIAMOND': '👑'
        }
        
        leaderboard = []
        for idx, entry in enumerate(results, start=offset + 1):
            # Count achievements/badges
            badge_count = self.db.achievements.count_documents({
                'customer_id': entry['customer_id'],
                'unlocked_at': {'$exists': True}
            })
            
            leaderboard.append({
                'rank': idx,
                'customer_id': entry['customer_id'],
                'name': entry.get('name', 'Anonymous'),
                'points': entry['total_points'],
                'tier': entry['tier'],
                'tier_emoji': tier_emojis.get(entry['tier'], ''),
                'badge_count': badge_count
            })
        
        total = self.db.customer_points.count_documents({})
        
        return {
            'leaderboard': leaderboard,
            'total_participants': total,
            'limit': limit,
            'offset': offset
        }
    
    def get_tier_leaderboard(self, tier: str, limit: int = 50) -> Dict:
        """
        Get leaderboard for specific tier.
        
        Args:
            tier: BRONZE, SILVER, GOLD, PLATINUM, or DIAMOND
            limit: Number of entries
            
        Returns:
            Tier-specific leaderboard
        """
        pipeline = [
            {'$match': {'tier': tier}},
            {'$sort': {'total_points': DESCENDING}},
            {'$limit': limit},
            {'$lookup': {
                'from': 'customers_v2',
                'localField': 'customer_id',
                'foreignField': '_id',
                'as': 'customer'
            }},
            {'$unwind': '$customer'},
            {'$project': {
                'customer_id': 1,
                'total_points': 1,
                'tier': 1,
                'name': '$customer.name'
            }}
        ]
        
        results = list(self.db.customer_points.aggregate(pipeline))
        
        leaderboard = []
        for idx, entry in enumerate(results, start=1):
            leaderboard.append({
                'rank': idx,
                'customer_id': entry['customer_id'],
                'name': entry.get('name', 'Anonymous'),
                'points': entry['total_points'],
                'tier': tier
            })
        
        return {
            'tier': tier,
            'leaderboard': leaderboard,
            'total_in_tier': self.db.customer_points.count_documents({'tier': tier})
        }
    
    def get_weekly_leaderboard(self, limit: int = 50) -> Dict:
        """
        Get weekly points leaderboard (points earned this week).
        
        Args:
            limit: Number of entries
            
        Returns:
            Weekly leaderboard
        """
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        pipeline = [
            {'$match': {'created_at': {'$gte': week_ago}}},
            {'$group': {
                '_id': '$customer_id',
                'weekly_points': {'$sum': '$points'}
            }},
            {'$sort': {'weekly_points': DESCENDING}},
            {'$limit': limit},
            {'$lookup': {
                'from': 'customer_points',
                'localField': '_id',
                'foreignField': 'customer_id',
                'as': 'customer_points'
            }}
        ]
        
        results = list(self.db.points_transactions.aggregate(pipeline))
        
        leaderboard = []
        for idx, entry in enumerate(results, start=1):
            leaderboard.append({
                'rank': idx,
                'customer_id': entry['_id'],
                'weekly_points': entry['weekly_points'],
                'tier': entry['customer_points'][0].get('tier', 'BRONZE') if entry['customer_points'] else 'BRONZE'
            })
        
        return {
            'period': 'weekly',
            'week_start': week_ago,
            'leaderboard': leaderboard
        }
    
    def get_customer_rank(self, customer_id: str) -> Dict:
        """
        Get customer's current rank in global leaderboard.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            {
                'rank': int,
                'total_participants': int,
                'percentile': float,
                'points': int
            }
        """
        customer = self.db.customer_points.find_one({'customer_id': customer_id})
        if not customer:
            return {'error': 'Customer not found'}
        
        # Count customers with more points
        rank = self.db.customer_points.count_documents({
            'total_points': {'$gt': customer['total_points']}
        }) + 1
        
        total = self.db.customer_points.count_documents({})
        percentile = ((total - rank + 1) / total * 100) if total > 0 else 0
        
        return {
            'rank': rank,
            'total_participants': total,
            'percentile': round(percentile, 1),
            'points': customer['total_points']
        }


class AchievementsService:
    """
    Manages achievements, badges, and milestones.
    Tracks unlocked achievements and progression.
    """
    
    def __init__(self, db):
        """Initialize with MongoDB database connection"""
        self.db = db
        self.ACHIEVEMENTS = {
            'first_order': {
                'name': 'First Step',
                'description': 'Place your first order',
                'icon': '🎁',
                'points': 50,
                'category': 'order'
            },
            'order_10': {
                'name': 'Regular Customer',
                'description': 'Place 10 orders',
                'icon': '⭐',
                'points': 100,
                'category': 'order',
                'threshold': 10
            },
            'order_50': {
                'name': 'Super Fan',
                'description': 'Place 50 orders',
                'icon': '🌟',
                'points': 250,
                'category': 'order',
                'threshold': 50
            },
            'points_1000': {
                'name': 'Point Collector',
                'description': 'Earn 1,000 loyalty points',
                'icon': '💰',
                'points': 100,
                'category': 'points',
                'threshold': 1000
            },
            'points_5000': {
                'name': 'Points Master',
                'description': 'Earn 5,000 loyalty points',
                'icon': '💎',
                'points': 250,
                'category': 'points',
                'threshold': 5000
            },
            'referral_5': {
                'name': 'Referral Rookie',
                'description': 'Successfully refer 5 customers',
                'icon': '👥',
                'points': 100,
                'category': 'referral',
                'threshold': 5
            },
            'referral_20': {
                'name': 'Referral Pro',
                'description': 'Successfully refer 20 customers',
                'icon': '🤝',
                'points': 300,
                'category': 'referral',
                'threshold': 20
            },
            'perfect_rating': {
                'name': 'Perfect Experience',
                'description': 'Maintain 5-star rating across 10 orders',
                'icon': '⚡',
                'points': 150,
                'category': 'quality'
            },
            'speed_shopper': {
                'name': 'Speed Shopper',
                'description': 'Complete checkout in under 30 seconds',
                'icon': '⚡',
                'points': 50,
                'category': 'speed'
            },
            'social_butterfly': {
                'name': 'Social Butterfly',
                'description': 'Share order with 5 friends',
                'icon': '🦋',
                'points': 100,
                'category': 'social'
            },
            'tier_gold': {
                'name': 'Golden Status',
                'description': 'Reach GOLD tier',
                'icon': '🥇',
                'points': 200,
                'category': 'tier'
            },
            'tier_platinum': {
                'name': 'Platinum Elite',
                'description': 'Reach PLATINUM tier',
                'icon': '💍',
                'points': 300,
                'category': 'tier'
            },
            'tier_diamond': {
                'name': 'Diamond VIP',
                'description': 'Reach DIAMOND tier',
                'icon': '👑',
                'points': 500,
                'category': 'tier'
            }
        }
    
    def get_customer_achievements(self, customer_id: str) -> Dict:
        """
        Get all achievements for a customer.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            {
                'unlocked': [achievement objects],
                'locked': [achievement objects],
                'total_achievements': int,
                'total_badge_points': int,
                'progress_to_next': Dict
            }
        """
        unlocked = list(self.db.achievements.find({
            'customer_id': customer_id,
            'unlocked_at': {'$exists': True}
        }))
        
        unlocked_ids = {a['achievement_id'] for a in unlocked}
        
        locked = []
        for ach_id, ach_data in self.ACHIEVEMENTS.items():
            if ach_id not in unlocked_ids:
                progress = self._get_achievement_progress(customer_id, ach_id)
                locked.append({
                    'achievement_id': ach_id,
                    'name': ach_data['name'],
                    'description': ach_data['description'],
                    'icon': ach_data['icon'],
                    'points': ach_data['points'],
                    'progress': progress.get('current', 0),
                    'threshold': progress.get('threshold', 0),
                    'progress_percentage': progress.get('percentage', 0)
                })
        
        total_badge_points = sum(a['points'] for a in unlocked)
        
        return {
            'unlocked': unlocked,
            'locked': locked,
            'total_achievements': len(self.ACHIEVEMENTS),
            'unlocked_count': len(unlocked),
            'total_badge_points': total_badge_points,
            'completion_percentage': (len(unlocked) / len(self.ACHIEVEMENTS) * 100) if self.ACHIEVEMENTS else 0
        }
    
    def _get_achievement_progress(self, customer_id: str, achievement_id: str) -> Dict:
        """Calculate progress towards achievement."""
        ach = self.ACHIEVEMENTS.get(achievement_id, {})
        threshold = ach.get('threshold', 1)
        
        if achievement_id.startswith('order_'):
            current = self.db.orders.count_documents({'customer_id': customer_id})
        elif achievement_id.startswith('points_'):
            pts = self.db.customer_points.find_one({'customer_id': customer_id})
            current = pts.get('total_points', 0) if pts else 0
        elif achievement_id.startswith('referral_'):
            current = self.db.referrals.count_documents({
                'referrer_id': customer_id,
                'status': 'COMPLETED'
            })
        else:
            current = 0
        
        percentage = min((current / threshold * 100) if threshold > 0 else 0, 100)
        
        return {
            'current': current,
            'threshold': threshold,
            'percentage': percentage
        }
    
    def unlock_achievement(self, customer_id: str, achievement_id: str) -> Dict:
        """
        Unlock achievement for customer.
        
        Args:
            customer_id: Customer ID
            achievement_id: Achievement ID from ACHIEVEMENTS
            
        Returns:
            {
                'success': bool,
                'achievement': achievement object,
                'bonus_points': int
            }
        """
        if achievement_id not in self.ACHIEVEMENTS:
            return {'success': False, 'error': 'Invalid achievement'}
        
        # Check if already unlocked
        existing = self.db.achievements.find_one({
            'customer_id': customer_id,
            'achievement_id': achievement_id,
            'unlocked_at': {'$exists': True}
        })
        
        if existing:
            return {'success': False, 'error': 'Achievement already unlocked'}
        
        ach = self.ACHIEVEMENTS[achievement_id]
        bonus_points = ach['points']
        
        # Insert achievement record
        self.db.achievements.insert_one({
            'customer_id': customer_id,
            'achievement_id': achievement_id,
            'name': ach['name'],
            'description': ach['description'],
            'icon': ach['icon'],
            'points': bonus_points,
            'unlocked_at': datetime.utcnow()
        })
        
        # Award bonus points
        self.db.customer_points.update_one(
            {'customer_id': customer_id},
            {
                '$inc': {
                    'total_points': bonus_points,
                    'available_points': bonus_points,
                    'achievement_points': bonus_points
                }
            }
        )
        
        return {
            'success': True,
            'achievement': {
                'achievement_id': achievement_id,
                'name': ach['name'],
                'icon': ach['icon'],
                'points': bonus_points
            },
            'bonus_points': bonus_points
        }
    
    def check_and_unlock_achievements(self, customer_id: str) -> List[Dict]:
        """
        Check all achievement conditions and unlock eligible ones.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            List of newly unlocked achievements
        """
        newly_unlocked = []
        
        # Check order count achievements
        order_count = self.db.orders.count_documents({'customer_id': customer_id})
        for count, ach_id in [(10, 'order_10'), (50, 'order_50')]:
            if order_count >= count:
                existing = self.db.achievements.find_one({
                    'customer_id': customer_id,
                    'achievement_id': ach_id,
                    'unlocked_at': {'$exists': True}
                })
                if not existing:
                    result = self.unlock_achievement(customer_id, ach_id)
                    if result['success']:
                        newly_unlocked.append(result['achievement'])
        
        # Check points achievements
        pts = self.db.customer_points.find_one({'customer_id': customer_id})
        if pts:
            total_pts = pts.get('total_points', 0)
            for threshold, ach_id in [(1000, 'points_1000'), (5000, 'points_5000')]:
                if total_pts >= threshold:
                    existing = self.db.achievements.find_one({
                        'customer_id': customer_id,
                        'achievement_id': ach_id,
                        'unlocked_at': {'$exists': True}
                    })
                    if not existing:
                        result = self.unlock_achievement(customer_id, ach_id)
                        if result['success']:
                            newly_unlocked.append(result['achievement'])
        
        # Check tier achievements
        if pts:
            tier = pts.get('tier')
            tier_ach_map = {
                'GOLD': 'tier_gold',
                'PLATINUM': 'tier_platinum',
                'DIAMOND': 'tier_diamond'
            }
            if tier in tier_ach_map:
                ach_id = tier_ach_map[tier]
                existing = self.db.achievements.find_one({
                    'customer_id': customer_id,
                    'achievement_id': ach_id,
                    'unlocked_at': {'$exists': True}
                })
                if not existing:
                    result = self.unlock_achievement(customer_id, ach_id)
                    if result['success']:
                        newly_unlocked.append(result['achievement'])
        
        return newly_unlocked

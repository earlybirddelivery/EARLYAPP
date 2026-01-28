"""
Customer Wallet Service - PHASE 4B.3
Manages prepaid credits, loyalty rewards, transaction history, and credit expiry.
Revenue Impact: ₹20-30K/month
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
import json
from bson import ObjectId
from pymongo import MongoClient
import logging

logger = logging.getLogger(__name__)


class WalletService:
    """
    Core wallet management service for customer prepaid credits and loyalty rewards.
    
    Features:
    - Customer wallet creation and management
    - Credit addition from purchases, referrals, promotions
    - Credit usage tracking
    - Transaction history
    - Loyalty rewards system
    - Automatic credit expiry management
    - Balance verification
    """
    
    def __init__(self, db):
        """
        Initialize wallet service with database connection.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.wallets = db.customer_wallets
        self.transactions = db.wallet_transactions
        self.rewards = db.loyalty_rewards
        self.expiry_logs = db.credit_expiry_logs
        
    # ===== WALLET CREATION & MANAGEMENT =====
    
    def create_wallet(self, customer_id: str, initial_balance: float = 0) -> Dict:
        """
        Create new customer wallet.
        
        Args:
            customer_id: Customer ID
            initial_balance: Initial credit balance (₹)
            
        Returns:
            Wallet document
            
        Raises:
            ValueError: If wallet already exists
        """
        # Check if wallet exists
        existing = self.wallets.find_one({"customer_id": customer_id})
        if existing:
            raise ValueError(f"Wallet already exists for customer {customer_id}")
        
        wallet = {
            "_id": ObjectId(),
            "customer_id": customer_id,
            "balance": float(initial_balance),
            "total_earned": float(initial_balance),
            "total_spent": 0.0,
            "total_refunded": 0.0,
            "status": "ACTIVE",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_transaction_date": None,
            "tier": self._calculate_tier(initial_balance),
            "metadata": {
                "referral_code": self._generate_referral_code(customer_id),
                "referral_count": 0,
                "total_purchases_eligible": 0
            }
        }
        
        result = self.wallets.insert_one(wallet)
        wallet["_id"] = str(result.inserted_id)
        
        logger.info(f"Wallet created for customer {customer_id}: ₹{initial_balance}")
        return wallet
    
    def get_wallet(self, customer_id: str) -> Optional[Dict]:
        """
        Get customer wallet with balance and status.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            Wallet document or None
        """
        wallet = self.wallets.find_one({"customer_id": customer_id})
        if wallet:
            wallet["_id"] = str(wallet["_id"])
            # Sync expired credits before returning
            self._process_expired_credits(customer_id)
            wallet = self.wallets.find_one({"customer_id": customer_id})
            wallet["_id"] = str(wallet["_id"])
        return wallet
    
    def get_wallet_balance(self, customer_id: str) -> float:
        """
        Get current wallet balance.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            Current balance in ₹
        """
        wallet = self.wallets.find_one(
            {"customer_id": customer_id},
            {"balance": 1}
        )
        return wallet["balance"] if wallet else 0.0
    
    # ===== CREDIT OPERATIONS =====
    
    def add_credits(
        self,
        customer_id: str,
        amount: float,
        reason: str,
        source: str = "manual",
        expiry_days: Optional[int] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Add credits to customer wallet.
        
        Credit sources:
        - "purchase": From product purchase
        - "referral": From referral bonus
        - "promotion": From promotional campaign
        - "refund": From order refund
        - "loyalty": From loyalty rewards
        - "manual": Admin manual addition
        
        Args:
            customer_id: Customer ID
            amount: Credit amount in ₹
            reason: Reason for credit addition
            source: Credit source type
            expiry_days: Days until credit expires (None = no expiry)
            metadata: Additional metadata
            
        Returns:
            Transaction document
            
        Raises:
            ValueError: If amount invalid or wallet doesn't exist
        """
        if amount <= 0:
            raise ValueError(f"Invalid amount: {amount}")
        
        wallet = self.wallets.find_one({"customer_id": customer_id})
        if not wallet:
            raise ValueError(f"Wallet not found for customer {customer_id}")
        
        # Calculate expiry date
        expiry_date = None
        if expiry_days:
            expiry_date = datetime.utcnow() + timedelta(days=expiry_days)
        
        # Create transaction record
        transaction = {
            "_id": ObjectId(),
            "customer_id": customer_id,
            "wallet_id": str(wallet["_id"]),
            "type": "CREDIT",
            "amount": float(amount),
            "reason": reason,
            "source": source,
            "expiry_date": expiry_date,
            "status": "COMPLETED",
            "created_at": datetime.utcnow(),
            "metadata": metadata or {}
        }
        
        self.transactions.insert_one(transaction)
        
        # Update wallet balance and statistics
        self.wallets.update_one(
            {"_id": wallet["_id"]},
            {
                "$inc": {
                    "balance": amount,
                    "total_earned": amount
                },
                "$set": {
                    "updated_at": datetime.utcnow(),
                    "last_transaction_date": datetime.utcnow(),
                    "tier": self._calculate_tier(wallet["balance"] + amount)
                }
            }
        )
        
        transaction["_id"] = str(transaction["_id"])
        logger.info(f"Credits added to {customer_id}: ₹{amount} ({source})")
        return transaction
    
    def deduct_credits(
        self,
        customer_id: str,
        amount: float,
        reason: str,
        order_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Deduct credits from customer wallet.
        
        Args:
            customer_id: Customer ID
            amount: Amount to deduct in ₹
            reason: Reason for deduction
            order_id: Associated order ID
            metadata: Additional metadata
            
        Returns:
            Transaction document
            
        Raises:
            ValueError: If insufficient balance or invalid amount
        """
        if amount <= 0:
            raise ValueError(f"Invalid amount: {amount}")
        
        wallet = self.wallets.find_one({"customer_id": customer_id})
        if not wallet:
            raise ValueError(f"Wallet not found for customer {customer_id}")
        
        # Check available balance (excluding expired)
        available_balance = wallet["balance"]
        if available_balance < amount:
            raise ValueError(
                f"Insufficient balance. Available: ₹{available_balance}, "
                f"Requested: ₹{amount}"
            )
        
        # Create transaction
        transaction = {
            "_id": ObjectId(),
            "customer_id": customer_id,
            "wallet_id": str(wallet["_id"]),
            "type": "DEBIT",
            "amount": float(amount),
            "reason": reason,
            "order_id": order_id,
            "status": "COMPLETED",
            "created_at": datetime.utcnow(),
            "metadata": metadata or {}
        }
        
        self.transactions.insert_one(transaction)
        
        # Update wallet
        self.wallets.update_one(
            {"_id": wallet["_id"]},
            {
                "$inc": {
                    "balance": -amount,
                    "total_spent": amount
                },
                "$set": {
                    "updated_at": datetime.utcnow(),
                    "last_transaction_date": datetime.utcnow()
                }
            }
        )
        
        transaction["_id"] = str(transaction["_id"])
        logger.info(f"Credits deducted from {customer_id}: ₹{amount} ({reason})")
        return transaction
    
    def refund_credits(
        self,
        customer_id: str,
        amount: float,
        order_id: str,
        reason: str = "Order refund"
    ) -> Dict:
        """
        Refund credits for cancelled/returned order.
        
        Args:
            customer_id: Customer ID
            amount: Refund amount in ₹
            order_id: Associated order ID
            reason: Refund reason
            
        Returns:
            Transaction document
        """
        transaction = {
            "_id": ObjectId(),
            "customer_id": customer_id,
            "type": "REFUND",
            "amount": float(amount),
            "reason": reason,
            "order_id": order_id,
            "status": "COMPLETED",
            "created_at": datetime.utcnow(),
            "metadata": {
                "refund_type": "wallet_credit",
                "order_id": order_id
            }
        }
        
        self.transactions.insert_one(transaction)
        
        wallet = self.wallets.find_one({"customer_id": customer_id})
        self.wallets.update_one(
            {"_id": wallet["_id"]},
            {
                "$inc": {
                    "balance": amount,
                    "total_refunded": amount
                },
                "$set": {
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        transaction["_id"] = str(transaction["_id"])
        logger.info(f"Refund issued to {customer_id}: ₹{amount}")
        return transaction
    
    # ===== TRANSACTION HISTORY =====
    
    def get_transaction_history(
        self,
        customer_id: str,
        limit: int = 50,
        skip: int = 0,
        transaction_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Tuple[List[Dict], int]:
        """
        Get transaction history for customer.
        
        Args:
            customer_id: Customer ID
            limit: Max records per page
            skip: Records to skip (pagination)
            transaction_type: Filter by CREDIT, DEBIT, REFUND
            start_date: Filter from date
            end_date: Filter to date
            
        Returns:
            Tuple of (transactions list, total count)
        """
        query = {"customer_id": customer_id}
        
        if transaction_type:
            query["type"] = transaction_type
        
        if start_date or end_date:
            date_query = {}
            if start_date:
                date_query["$gte"] = start_date
            if end_date:
                date_query["$lte"] = end_date
            query["created_at"] = date_query
        
        total = self.transactions.count_documents(query)
        
        transactions = list(
            self.transactions.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        
        for tx in transactions:
            tx["_id"] = str(tx["_id"])
        
        return transactions, total
    
    def get_transaction_summary(self, customer_id: str) -> Dict:
        """
        Get transaction summary statistics.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            Summary statistics
        """
        pipeline = [
            {"$match": {"customer_id": customer_id}},
            {
                "$group": {
                    "_id": "$type",
                    "total_amount": {"$sum": "$amount"},
                    "count": {"$sum": 1}
                }
            }
        ]
        
        summary = {
            "credit_total": 0,
            "credit_count": 0,
            "debit_total": 0,
            "debit_count": 0,
            "refund_total": 0,
            "refund_count": 0
        }
        
        for record in self.transactions.aggregate(pipeline):
            tx_type = record["_id"]
            if tx_type == "CREDIT":
                summary["credit_total"] = record["total_amount"]
                summary["credit_count"] = record["count"]
            elif tx_type == "DEBIT":
                summary["debit_total"] = record["total_amount"]
                summary["debit_count"] = record["count"]
            elif tx_type == "REFUND":
                summary["refund_total"] = record["total_amount"]
                summary["refund_count"] = record["count"]
        
        return summary
    
    # ===== LOYALTY REWARDS =====
    
    def create_loyalty_reward(
        self,
        name: str,
        description: str,
        credit_amount: float,
        min_purchase_amount: float = 0,
        max_uses: Optional[int] = None,
        valid_from: Optional[datetime] = None,
        valid_until: Optional[datetime] = None,
        applicable_to: Optional[List[str]] = None
    ) -> Dict:
        """
        Create loyalty reward program.
        
        Args:
            name: Reward name
            description: Reward description
            credit_amount: Credits awarded
            min_purchase_amount: Minimum purchase to qualify (₹)
            max_uses: Max usage count (None = unlimited)
            valid_from: Start validity date
            valid_until: End validity date
            applicable_to: List of product IDs or categories
            
        Returns:
            Reward document
        """
        reward = {
            "_id": ObjectId(),
            "name": name,
            "description": description,
            "credit_amount": float(credit_amount),
            "min_purchase_amount": float(min_purchase_amount),
            "max_uses": max_uses,
            "total_uses": 0,
            "valid_from": valid_from or datetime.utcnow(),
            "valid_until": valid_until,
            "applicable_to": applicable_to or [],
            "status": "ACTIVE",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        self.rewards.insert_one(reward)
        reward["_id"] = str(reward["_id"])
        logger.info(f"Loyalty reward created: {name}")
        return reward
    
    def apply_loyalty_reward(
        self,
        customer_id: str,
        reward_id: str,
        order_id: Optional[str] = None
    ) -> Dict:
        """
        Apply loyalty reward to customer wallet.
        
        Args:
            customer_id: Customer ID
            reward_id: Reward ID
            order_id: Associated order ID
            
        Returns:
            Transaction document
            
        Raises:
            ValueError: If reward invalid or limit exceeded
        """
        reward = self.rewards.find_one({"_id": ObjectId(reward_id)})
        if not reward:
            raise ValueError(f"Reward not found: {reward_id}")
        
        # Check validity
        now = datetime.utcnow()
        if reward["valid_until"] and now > reward["valid_until"]:
            raise ValueError("Reward expired")
        
        if reward["max_uses"] and reward["total_uses"] >= reward["max_uses"]:
            raise ValueError("Reward usage limit exceeded")
        
        # Add credits
        transaction = self.add_credits(
            customer_id=customer_id,
            amount=reward["credit_amount"],
            reason=f"Loyalty reward: {reward['name']}",
            source="loyalty",
            metadata={
                "reward_id": str(reward["_id"]),
                "reward_name": reward["name"],
                "order_id": order_id
            }
        )
        
        # Update reward usage
        self.rewards.update_one(
            {"_id": ObjectId(reward_id)},
            {
                "$inc": {"total_uses": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        logger.info(f"Loyalty reward applied to {customer_id}: {reward['name']}")
        return transaction
    
    def get_available_rewards(self, customer_id: str) -> List[Dict]:
        """
        Get available loyalty rewards for customer.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            List of available rewards
        """
        now = datetime.utcnow()
        
        rewards = list(
            self.rewards.find({
                "status": "ACTIVE",
                "valid_from": {"$lte": now},
                "$or": [
                    {"valid_until": {"$gte": now}},
                    {"valid_until": None}
                ],
                "$expr": {
                    "$or": [
                        {"$eq": ["$max_uses", None]},
                        {"$lt": ["$total_uses", "$max_uses"]}
                    ]
                }
            })
        )
        
        for reward in rewards:
            reward["_id"] = str(reward["_id"])
        
        return rewards
    
    # ===== CREDIT EXPIRY MANAGEMENT =====
    
    def _process_expired_credits(self, customer_id: str) -> int:
        """
        Process and remove expired credits.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            Amount of credits expired
        """
        expired_transactions = list(
            self.transactions.find({
                "customer_id": customer_id,
                "type": "CREDIT",
                "expiry_date": {"$lt": datetime.utcnow()},
                "status": "COMPLETED"
            })
        )
        
        total_expired = 0
        
        for tx in expired_transactions:
            expired_amount = tx["amount"]
            total_expired += expired_amount
            
            # Mark transaction as expired
            self.transactions.update_one(
                {"_id": tx["_id"]},
                {"$set": {"status": "EXPIRED"}}
            )
            
            # Log expiry
            self.expiry_logs.insert_one({
                "_id": ObjectId(),
                "customer_id": customer_id,
                "transaction_id": str(tx["_id"]),
                "amount": expired_amount,
                "expired_at": datetime.utcnow(),
                "original_expiry": tx["expiry_date"]
            })
        
        # Update wallet balance if expired credits found
        if total_expired > 0:
            wallet = self.wallets.find_one({"customer_id": customer_id})
            self.wallets.update_one(
                {"_id": wallet["_id"]},
                {
                    "$inc": {"balance": -total_expired},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            logger.info(f"Expired ₹{total_expired} credits for {customer_id}")
        
        return total_expired
    
    def get_expiring_credits(self, customer_id: str, days_ahead: int = 30) -> List[Dict]:
        """
        Get credits expiring within specified days.
        
        Args:
            customer_id: Customer ID
            days_ahead: Days to check ahead
            
        Returns:
            List of expiring transaction records
        """
        now = datetime.utcnow()
        future = now + timedelta(days=days_ahead)
        
        expiring = list(
            self.transactions.find({
                "customer_id": customer_id,
                "type": "CREDIT",
                "expiry_date": {
                    "$gt": now,
                    "$lte": future
                },
                "status": "COMPLETED"
            }).sort("expiry_date", 1)
        )
        
        for tx in expiring:
            tx["_id"] = str(tx["_id"])
            days_remaining = (tx["expiry_date"] - now).days
            tx["days_remaining"] = days_remaining
        
        return expiring
    
    def get_expiry_history(
        self,
        customer_id: str,
        limit: int = 20
    ) -> List[Dict]:
        """
        Get credit expiry history.
        
        Args:
            customer_id: Customer ID
            limit: Max records
            
        Returns:
            List of expiry logs
        """
        logs = list(
            self.expiry_logs.find({"customer_id": customer_id})
            .sort("expired_at", -1)
            .limit(limit)
        )
        
        for log in logs:
            log["_id"] = str(log["_id"])
        
        return logs
    
    # ===== TIER MANAGEMENT =====
    
    def _calculate_tier(self, balance: float) -> str:
        """
        Calculate customer tier based on balance.
        
        Args:
            balance: Current wallet balance
            
        Returns:
            Tier level (BRONZE, SILVER, GOLD, PLATINUM)
        """
        if balance >= 10000:
            return "PLATINUM"
        elif balance >= 5000:
            return "GOLD"
        elif balance >= 1000:
            return "SILVER"
        else:
            return "BRONZE"
    
    def get_tier_benefits(self, tier: str) -> Dict:
        """
        Get benefits for wallet tier.
        
        Args:
            tier: Tier level
            
        Returns:
            Benefits dictionary
        """
        benefits_map = {
            "BRONZE": {
                "min_balance": 0,
                "credit_expiry_days": 365,
                "bonus_multiplier": 1.0,
                "exclusive_rewards": []
            },
            "SILVER": {
                "min_balance": 1000,
                "credit_expiry_days": 730,  # 2 years
                "bonus_multiplier": 1.05,
                "exclusive_rewards": ["silver_exclusive_1"]
            },
            "GOLD": {
                "min_balance": 5000,
                "credit_expiry_days": 1095,  # 3 years
                "bonus_multiplier": 1.10,
                "exclusive_rewards": ["gold_exclusive_1", "gold_exclusive_2"]
            },
            "PLATINUM": {
                "min_balance": 10000,
                "credit_expiry_days": 1825,  # 5 years
                "bonus_multiplier": 1.20,
                "exclusive_rewards": ["platinum_exclusive_1", "platinum_exclusive_2", "platinum_vip"]
            }
        }
        
        return benefits_map.get(tier, benefits_map["BRONZE"])
    
    # ===== REFERRAL SYSTEM =====
    
    def _generate_referral_code(self, customer_id: str) -> str:
        """Generate unique referral code."""
        return f"REF{customer_id[:8].upper()}{int(datetime.utcnow().timestamp()) % 10000:04d}"
    
    def get_referral_code(self, customer_id: str) -> Optional[str]:
        """Get customer's referral code."""
        wallet = self.wallets.find_one(
            {"customer_id": customer_id},
            {"metadata.referral_code": 1}
        )
        return wallet["metadata"]["referral_code"] if wallet else None
    
    def apply_referral_bonus(
        self,
        referrer_id: str,
        referred_id: str,
        bonus_amount: float = 100.0
    ) -> Tuple[Dict, Dict]:
        """
        Apply referral bonus to both referrer and referred customer.
        
        Args:
            referrer_id: Customer who referred
            referred_id: Customer being referred
            bonus_amount: Bonus amount in ₹
            
        Returns:
            Tuple of (referrer_tx, referred_tx)
        """
        # Add to referrer
        referrer_tx = self.add_credits(
            customer_id=referrer_id,
            amount=bonus_amount,
            reason="Referral bonus",
            source="referral",
            expiry_days=365,
            metadata={"referred_customer": referred_id}
        )
        
        # Add to referred (usually lower amount)
        referred_tx = self.add_credits(
            customer_id=referred_id,
            amount=bonus_amount * 0.5,  # 50% of referrer bonus
            reason="Referral signup bonus",
            source="referral",
            expiry_days=365,
            metadata={"referrer_customer": referrer_id}
        )
        
        # Update referral count
        self.wallets.update_one(
            {"customer_id": referrer_id},
            {"$inc": {"metadata.referral_count": 1}}
        )
        
        logger.info(f"Referral bonus applied: {referrer_id} -> {referred_id}")
        return referrer_tx, referred_tx
    
    # ===== WALLET STATISTICS =====
    
    def get_wallet_statistics(self, customer_id: str) -> Dict:
        """
        Get comprehensive wallet statistics.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            Statistics dictionary
        """
        wallet = self.wallets.find_one({"customer_id": customer_id})
        if not wallet:
            return {}
        
        tx_summary = self.get_transaction_summary(customer_id)
        expiring = self.get_expiring_credits(customer_id, days_ahead=30)
        
        return {
            "customer_id": customer_id,
            "current_balance": wallet["balance"],
            "total_earned": wallet["total_earned"],
            "total_spent": wallet["total_spent"],
            "total_refunded": wallet["total_refunded"],
            "tier": wallet["tier"],
            "tier_benefits": self.get_tier_benefits(wallet["tier"]),
            "referral_code": wallet["metadata"]["referral_code"],
            "referral_count": wallet["metadata"]["referral_count"],
            "transactions": tx_summary,
            "expiring_soon": len(expiring),
            "created_at": wallet["created_at"],
            "last_transaction": wallet["last_transaction_date"]
        }
    
    def bulk_add_credits(
        self,
        credits_data: List[Dict]
    ) -> List[Dict]:
        """
        Add credits to multiple customers (bulk operation).
        
        Args:
            credits_data: List of {"customer_id", "amount", "reason", "source"}
            
        Returns:
            List of transaction results
        """
        results = []
        
        for credit in credits_data:
            try:
                tx = self.add_credits(
                    customer_id=credit["customer_id"],
                    amount=credit["amount"],
                    reason=credit.get("reason", "Bulk credit"),
                    source=credit.get("source", "admin"),
                    metadata=credit.get("metadata")
                )
                results.append({"status": "success", "transaction": tx})
            except Exception as e:
                results.append({
                    "status": "error",
                    "customer_id": credit["customer_id"],
                    "error": str(e)
                })
                logger.error(f"Error adding credits to {credit['customer_id']}: {e}")
        
        return results

"""
Customer Wallet Database Models - PHASE 4B.3
MongoDB schema definitions for wallet, transactions, rewards, and expiry management.
"""

from datetime import datetime
from typing import Optional, List


class CustomerWallet:
    """
    Customer Wallet Collection Schema
    
    Stores prepaid credits balance and wallet metadata.
    """
    
    collection_name = "customer_wallets"
    
    schema = {
        "_id": "ObjectId",  # Unique wallet ID
        "customer_id": "String (unique)",  # Links to customers_v2
        "balance": "Float",  # Current available credits in ₹
        "total_earned": "Float",  # Total credits earned (all-time)
        "total_spent": "Float",  # Total credits spent (all-time)
        "total_refunded": "Float",  # Total refunded (all-time)
        "status": "String",  # ACTIVE, FROZEN, SUSPENDED
        "tier": "String",  # BRONZE, SILVER, GOLD, PLATINUM
        "created_at": "DateTime",
        "updated_at": "DateTime",
        "last_transaction_date": "DateTime (nullable)",
        "metadata": {
            "referral_code": "String",  # Unique referral code
            "referral_count": "Integer",  # Count of successful referrals
            "total_purchases_eligible": "Integer"  # For tier calculation
        }
    }
    
    indexes = [
        {"customer_id": 1, "unique": True},
        {"tier": 1},
        {"status": 1},
        {"balance": 1},
        {"created_at": -1}
    ]
    
    example_document = {
        "_id": "ObjectId('...')",
        "customer_id": "cust_12345",
        "balance": 2500.50,
        "total_earned": 5000.00,
        "total_spent": 2000.00,
        "total_refunded": 500.00,
        "status": "ACTIVE",
        "tier": "GOLD",
        "created_at": "2026-01-28T10:30:00Z",
        "updated_at": "2026-01-28T14:45:00Z",
        "last_transaction_date": "2026-01-28T14:45:00Z",
        "metadata": {
            "referral_code": "REFCUST12345ABC",
            "referral_count": 3,
            "total_purchases_eligible": 8
        }
    }


class WalletTransaction:
    """
    Wallet Transactions Collection Schema
    
    Records all credit additions, deductions, and refunds.
    """
    
    collection_name = "wallet_transactions"
    
    schema = {
        "_id": "ObjectId",
        "customer_id": "String",  # Links to customers_v2
        "wallet_id": "String",  # Links to customer_wallets
        "type": "String",  # CREDIT, DEBIT, REFUND
        "amount": "Float",  # Amount in ₹
        "reason": "String",  # Description of transaction
        "source": "String",  # purchase, referral, promotion, loyalty, refund, manual
        "order_id": "String (nullable)",  # Links to orders
        "status": "String",  # COMPLETED, PENDING, FAILED, EXPIRED
        "expiry_date": "DateTime (nullable)",  # When credits expire
        "created_at": "DateTime",
        "metadata": "Object"  # Additional context
    }
    
    indexes = [
        {"customer_id": 1, "created_at": -1},
        {"wallet_id": 1},
        {"type": 1},
        {"source": 1},
        {"order_id": 1},
        {"status": 1},
        {"expiry_date": 1},
        {"created_at": -1}
    ]
    
    example_document = {
        "_id": "ObjectId('...')",
        "customer_id": "cust_12345",
        "wallet_id": "ObjectId('...')",
        "type": "CREDIT",
        "amount": 500.00,
        "reason": "Order purchase reward",
        "source": "purchase",
        "order_id": "order_789",
        "status": "COMPLETED",
        "expiry_date": "2027-01-28T00:00:00Z",
        "created_at": "2026-01-28T10:30:00Z",
        "metadata": {
            "order_value": 2000.00,
            "reward_percentage": 0.25,
            "promotion_code": "NEW25"
        }
    }


class LoyaltyReward:
    """
    Loyalty Rewards Program Collection Schema
    
    Defines reward programs that customers can claim.
    """
    
    collection_name = "loyalty_rewards"
    
    schema = {
        "_id": "ObjectId",
        "name": "String",  # Reward name
        "description": "String",  # Detailed description
        "credit_amount": "Float",  # Credits awarded in ₹
        "min_purchase_amount": "Float",  # Minimum purchase to qualify
        "max_uses": "Integer (nullable)",  # Max times reward can be used (null = unlimited)
        "total_uses": "Integer",  # Current usage count
        "valid_from": "DateTime",
        "valid_until": "DateTime (nullable)",
        "applicable_to": "Array of Strings",  # Product IDs or categories
        "status": "String",  # ACTIVE, INACTIVE, EXPIRED
        "created_at": "DateTime",
        "updated_at": "DateTime",
        "created_by": "String"  # Admin user ID
    }
    
    indexes = [
        {"status": 1, "valid_from": 1},
        {"valid_until": 1},
        {"created_at": -1}
    ]
    
    example_document = {
        "_id": "ObjectId('...')",
        "name": "Birthday Month Bonus",
        "description": "Get ₹500 extra credits in your birthday month",
        "credit_amount": 500.00,
        "min_purchase_amount": 0.00,
        "max_uses": 1000,
        "total_uses": 234,
        "valid_from": "2026-01-01T00:00:00Z",
        "valid_until": "2026-12-31T23:59:59Z",
        "applicable_to": [],
        "status": "ACTIVE",
        "created_at": "2026-01-15T09:00:00Z",
        "updated_at": "2026-01-28T10:00:00Z",
        "created_by": "admin_user_123"
    }


class CreditExpiryLog:
    """
    Credit Expiry Logs Collection Schema
    
    Tracks when and which credits have expired.
    """
    
    collection_name = "credit_expiry_logs"
    
    schema = {
        "_id": "ObjectId",
        "customer_id": "String",
        "transaction_id": "String",  # Links to wallet_transactions
        "amount": "Float",  # Amount that expired
        "original_expiry": "DateTime",  # Original expiry date
        "expired_at": "DateTime",  # When it was processed as expired
        "reason": "String (nullable)"  # Reason for expiry
    }
    
    indexes = [
        {"customer_id": 1, "expired_at": -1},
        {"transaction_id": 1},
        {"expired_at": -1}
    ]
    
    example_document = {
        "_id": "ObjectId('...')",
        "customer_id": "cust_12345",
        "transaction_id": "ObjectId('...')",
        "amount": 100.00,
        "original_expiry": "2026-01-28T00:00:00Z",
        "expired_at": "2026-01-29T02:30:00Z",
        "reason": "Automatic expiry - 365 days passed"
    }


class WalletTier:
    """
    Wallet Tier Benefits Configuration
    
    Static configuration for tier benefits.
    """
    
    tiers = {
        "BRONZE": {
            "name": "Bronze",
            "min_balance": 0,
            "max_balance": 999.99,
            "credit_expiry_days": 365,
            "bonus_multiplier": 1.0,
            "exclusive_rewards": [],
            "benefits": [
                "₹0-999: Standard wallet benefits",
                "Credits expire after 1 year",
                "Access to seasonal promotions"
            ]
        },
        "SILVER": {
            "name": "Silver",
            "min_balance": 1000,
            "max_balance": 4999.99,
            "credit_expiry_days": 730,
            "bonus_multiplier": 1.05,
            "exclusive_rewards": ["silver_birthday_bonus", "silver_anniversary"],
            "benefits": [
                "₹1000+: Enhanced benefits",
                "Credits expire after 2 years",
                "Extra 5% bonus on rewards",
                "Priority customer support",
                "Monthly credit statement"
            ]
        },
        "GOLD": {
            "name": "Gold",
            "min_balance": 5000,
            "max_balance": 9999.99,
            "credit_expiry_days": 1095,
            "bonus_multiplier": 1.10,
            "exclusive_rewards": ["gold_cashback", "gold_vip_access", "gold_free_delivery"],
            "benefits": [
                "₹5000+: Premium benefits",
                "Credits expire after 3 years",
                "Extra 10% bonus on rewards",
                "VIP customer support (priority)",
                "Free delivery on all orders",
                "Exclusive early access to sales"
            ]
        },
        "PLATINUM": {
            "name": "Platinum",
            "min_balance": 10000,
            "credit_expiry_days": 1825,
            "bonus_multiplier": 1.20,
            "exclusive_rewards": ["platinum_concierge", "platinum_insurance", "platinum_anniversary_gift"],
            "benefits": [
                "₹10000+: Ultimate benefits",
                "Credits expire after 5 years",
                "Extra 20% bonus on rewards",
                "24/7 Concierge support",
                "Free delivery with 0 order minimum",
                "VIP event invitations",
                "Personal account manager",
                "Special anniversary gifts"
            ]
        }
    }


class ReferralSystem:
    """
    Referral System Configuration
    
    Manages referral bonuses and tracking.
    """
    
    configuration = {
        "referrer_bonus": {
            "amount": 100.00,  # Base bonus in ₹
            "currency": "INR",
            "expiry_days": 365
        },
        "referred_bonus": {
            "amount": 50.00,  # 50% of referrer bonus
            "currency": "INR",
            "expiry_days": 365
        },
        "referral_code_format": "REF{CUSTOMER_ID}{TIMESTAMP}",
        "tier_bonuses": {
            "SILVER": 1.05,  # 5% extra on referrer bonus
            "GOLD": 1.10,    # 10% extra
            "PLATINUM": 1.20  # 20% extra
        },
        "max_referrals_per_month": None  # None = unlimited
    }


# Migration Script - Create Collections and Indexes
migration_script = """
// 1. Create customer_wallets collection with schema validation
db.createCollection("customer_wallets", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["customer_id", "balance", "total_earned", "total_spent", "status", "tier"],
            properties: {
                _id: { bsonType: "objectId" },
                customer_id: { bsonType: "string" },
                balance: { bsonType: "double", minimum: 0 },
                total_earned: { bsonType: "double", minimum: 0 },
                total_spent: { bsonType: "double", minimum: 0 },
                total_refunded: { bsonType: "double", minimum: 0 },
                status: { 
                    enum: ["ACTIVE", "FROZEN", "SUSPENDED"]
                },
                tier: {
                    enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM"]
                },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" },
                last_transaction_date: { bsonType: ["date", "null"] },
                metadata: { bsonType: "object" }
            }
        }
    }
})

// Create indexes for customer_wallets
db.customer_wallets.createIndex({ customer_id: 1 }, { unique: true })
db.customer_wallets.createIndex({ tier: 1 })
db.customer_wallets.createIndex({ status: 1 })
db.customer_wallets.createIndex({ balance: 1 })
db.customer_wallets.createIndex({ created_at: -1 })


// 2. Create wallet_transactions collection
db.createCollection("wallet_transactions", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["customer_id", "type", "amount", "reason", "status", "created_at"],
            properties: {
                _id: { bsonType: "objectId" },
                customer_id: { bsonType: "string" },
                wallet_id: { bsonType: "string" },
                type: {
                    enum: ["CREDIT", "DEBIT", "REFUND"]
                },
                amount: { bsonType: "double", minimum: 0 },
                reason: { bsonType: "string" },
                source: { 
                    enum: ["purchase", "referral", "promotion", "loyalty", "refund", "manual"]
                },
                order_id: { bsonType: ["string", "null"] },
                status: {
                    enum: ["COMPLETED", "PENDING", "FAILED", "EXPIRED"]
                },
                expiry_date: { bsonType: ["date", "null"] },
                created_at: { bsonType: "date" },
                metadata: { bsonType: "object" }
            }
        }
    }
})

// Create indexes for wallet_transactions
db.wallet_transactions.createIndex({ customer_id: 1, created_at: -1 })
db.wallet_transactions.createIndex({ wallet_id: 1 })
db.wallet_transactions.createIndex({ type: 1 })
db.wallet_transactions.createIndex({ source: 1 })
db.wallet_transactions.createIndex({ order_id: 1 })
db.wallet_transactions.createIndex({ status: 1 })
db.wallet_transactions.createIndex({ expiry_date: 1 })
db.wallet_transactions.createIndex({ created_at: -1 })


// 3. Create loyalty_rewards collection
db.createCollection("loyalty_rewards", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["name", "description", "credit_amount", "status"],
            properties: {
                _id: { bsonType: "objectId" },
                name: { bsonType: "string" },
                description: { bsonType: "string" },
                credit_amount: { bsonType: "double", minimum: 0 },
                min_purchase_amount: { bsonType: "double", minimum: 0 },
                max_uses: { bsonType: ["int", "null"] },
                total_uses: { bsonType: "int", minimum: 0 },
                valid_from: { bsonType: "date" },
                valid_until: { bsonType: ["date", "null"] },
                applicable_to: { bsonType: "array" },
                status: {
                    enum: ["ACTIVE", "INACTIVE", "EXPIRED"]
                },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" },
                created_by: { bsonType: "string" }
            }
        }
    }
})

// Create indexes for loyalty_rewards
db.loyalty_rewards.createIndex({ status: 1, valid_from: 1 })
db.loyalty_rewards.createIndex({ valid_until: 1 })
db.loyalty_rewards.createIndex({ created_at: -1 })


// 4. Create credit_expiry_logs collection
db.createCollection("credit_expiry_logs", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["customer_id", "transaction_id", "amount", "expired_at"],
            properties: {
                _id: { bsonType: "objectId" },
                customer_id: { bsonType: "string" },
                transaction_id: { bsonType: "string" },
                amount: { bsonType: "double", minimum: 0 },
                original_expiry: { bsonType: "date" },
                expired_at: { bsonType: "date" },
                reason: { bsonType: ["string", "null"] }
            }
        }
    }
})

// Create indexes for credit_expiry_logs
db.credit_expiry_logs.createIndex({ customer_id: 1, expired_at: -1 })
db.credit_expiry_logs.createIndex({ transaction_id: 1 })
db.credit_expiry_logs.createIndex({ expired_at: -1 })


// 5. Create TTL index for automatic deletion of old logs (90 days)
db.credit_expiry_logs.createIndex(
    { expired_at: 1 },
    { expireAfterSeconds: 7776000 }  // 90 days
)

print("All Customer Wallet collections created successfully!")
"""


# Sample Data for Testing
sample_wallets = [
    {
        "_id": "ObjectId('60d5ec49f1b2c72d8c8e4a01')",
        "customer_id": "cust_test_001",
        "balance": 5500.00,
        "total_earned": 8000.00,
        "total_spent": 2000.00,
        "total_refunded": 500.00,
        "status": "ACTIVE",
        "tier": "GOLD",
        "created_at": "2025-12-01T10:00:00Z",
        "updated_at": "2026-01-28T15:30:00Z",
        "last_transaction_date": "2026-01-28T15:30:00Z",
        "metadata": {
            "referral_code": "REFCUST0001XYZ",
            "referral_count": 2,
            "total_purchases_eligible": 12
        }
    }
]

sample_transactions = [
    {
        "_id": "ObjectId('60d5ec49f1b2c72d8c8e4a02')",
        "customer_id": "cust_test_001",
        "wallet_id": "60d5ec49f1b2c72d8c8e4a01",
        "type": "CREDIT",
        "amount": 500.00,
        "reason": "Order purchase reward",
        "source": "purchase",
        "order_id": "order_12345",
        "status": "COMPLETED",
        "expiry_date": "2027-01-28T00:00:00Z",
        "created_at": "2026-01-28T10:30:00Z",
        "metadata": {
            "order_value": 2000.00,
            "reward_percentage": 0.25
        }
    }
]

sample_rewards = [
    {
        "_id": "ObjectId('60d5ec49f1b2c72d8c8e4a03')",
        "name": "New Year Bonus",
        "description": "Special bonus for January",
        "credit_amount": 250.00,
        "min_purchase_amount": 500.00,
        "max_uses": 5000,
        "total_uses": 1234,
        "valid_from": "2026-01-01T00:00:00Z",
        "valid_until": "2026-01-31T23:59:59Z",
        "applicable_to": [],
        "status": "ACTIVE",
        "created_at": "2025-12-20T09:00:00Z",
        "updated_at": "2026-01-28T10:00:00Z",
        "created_by": "admin_001"
    }
]

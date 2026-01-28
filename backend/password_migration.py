"""
Password Migration Helper Module
================================

Handles transition from SHA256 to bcrypt during migration period.
Supports both verification methods during migration.

Features:
- Verify password with SHA256 or bcrypt
- Auto-upgrade SHA256 to bcrypt on login
- Track migration progress
- Backward compatible
"""

import hashlib
from datetime import datetime, timezone
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)


async def verify_password_with_migration(
    plain_password: str,
    stored_hash: str,
    user_id: str = None,
    db=None
) -> tuple[bool, bool]:
    """
    Verify password supporting both SHA256 and bcrypt during migration.
    
    Returns:
        (is_valid, was_sha256_upgraded) - Boolean tuple indicating if password
                                         is valid and if it was upgraded
    
    Process:
    1. First try bcrypt (new format)
    2. If bcrypt fails, try SHA256 (old format)
    3. If SHA256 succeeds and db available, upgrade to bcrypt
    """
    
    # Try bcrypt first (modern format)
    try:
        if pwd_context.verify(plain_password, stored_hash):
            return True, False  # Valid bcrypt, no upgrade needed
    except Exception:
        pass  # Not bcrypt, try SHA256
    
    # Try SHA256 (legacy format)
    if await is_sha256_hash(stored_hash):
        sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest()
        if sha256_hash == stored_hash:
            # Correct password with SHA256!
            # Upgrade to bcrypt if db connection available
            if user_id and db:
                new_hash = hash_password_bcrypt(plain_password)
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {
                        "password_hash": new_hash,
                        "password_hash_upgraded_at": datetime.now(timezone.utc),
                        "password_migration_method": "lazy_upgrade_on_login"
                    }}
                )
                return True, True  # Valid, was upgraded
            else:
                return True, False  # Valid SHA256 but no upgrade done
    
    return False, False  # Invalid password


async def is_sha256_hash(hash_value: str) -> bool:
    """Check if value is a SHA256 hash (64 hex characters)"""
    if not hash_value:
        return False
    return len(hash_value) == 64 and all(c in '0123456789abcdefABCDEF' for c in hash_value)


def hash_password_bcrypt(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


def hash_password_sha256(password: str) -> str:
    """Hash password using SHA256 (legacy, for testing only)"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password_bcrypt(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt only (post-migration)"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def verify_password_sha256(plain_password: str, hashed_password: str) -> bool:
    """Verify password using SHA256 only (legacy, for testing only)"""
    return hash_password_sha256(plain_password) == hashed_password


class PasswordMigrationStatus:
    """Track password migration progress"""
    
    def __init__(self):
        self.total_users = 0
        self.bcrypt_migrated = 0
        self.sha256_remaining = 0
        self.sha256_upgraded_this_session = 0
    
    def get_migration_percentage(self) -> float:
        """Get migration completion percentage"""
        if self.total_users == 0:
            return 0.0
        return (self.bcrypt_migrated / self.total_users) * 100
    
    def get_status_report(self) -> dict:
        """Get current migration status"""
        return {
            "total_users": self.total_users,
            "bcrypt_migrated": self.bcrypt_migrated,
            "sha256_remaining": self.sha256_remaining,
            "upgraded_this_session": self.sha256_upgraded_this_session,
            "migration_percentage": self.get_migration_percentage(),
            "status": "complete" if self.sha256_remaining == 0 else "in_progress"
        }


# Global migration tracker (in production, use Redis or database)
migration_status = PasswordMigrationStatus()


async def update_migration_stats(db):
    """Update migration statistics from database"""
    global migration_status
    
    users = await db.users.find({}, {"_id": 0}).to_list(None)
    migration_status.total_users = len(users)
    migration_status.bcrypt_migrated = 0
    migration_status.sha256_remaining = 0
    
    for user in users:
        password = user.get("password") or user.get("password_hash")
        if not password:
            continue
        
        if await is_sha256_hash(password):
            migration_status.sha256_remaining += 1
        elif password.startswith("$2b$") or password.startswith("$2a$"):
            migration_status.bcrypt_migrated += 1
    
    return migration_status.get_status_report()

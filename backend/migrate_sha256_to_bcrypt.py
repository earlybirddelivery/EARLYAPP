#!/usr/bin/env python3
"""
Password Migration Script: SHA256 to Bcrypt
============================================

This script migrates all existing SHA256 password hashes to bcrypt.

Features:
- Identifies SHA256 hashes (64-character hex strings)
- Converts them to bcrypt during next login (lazy migration)
- Marks users for password reset if immediate migration is preferred
- Provides statistics on migration progress
- Creates audit trail of migration

Usage:
    python migrate_sha256_to_bcrypt.py

Modes:
    1. Lazy Migration (recommended): 
       - Passwords upgraded on next login
       - Transparent to users
       - Zero downtime
    
    2. Force Migration:
       - All passwords upgraded immediately
       - Users marked with force_password_reset=True
       - Requires admin notification
"""

import asyncio
from pathlib import Path
from datetime import datetime, timezone
from passlib.context import CryptContext
import sys
import os

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from database import db
from auth import pwd_context, hash_password


async def is_sha256_hash(hash_value: str) -> bool:
    """Check if a value is a SHA256 hash (64 hex chars)"""
    if not hash_value:
        return False
    return len(hash_value) == 64 and all(c in '0123456789abcdefABCDEF' for c in hash_value)


async def analyze_passwords():
    """Analyze current password hashes in database"""
    print("\n" + "="*80)
    print("PASSWORD HASH ANALYSIS")
    print("="*80)
    
    users = await db.users.find({}, {"_id": 0}).to_list(None)
    
    sha256_count = 0
    bcrypt_count = 0
    other_count = 0
    empty_count = 0
    
    sha256_users = []
    bcrypt_users = []
    
    for user in users:
        password = user.get("password") or user.get("password_hash")
        
        if not password:
            empty_count += 1
        elif await is_sha256_hash(password):
            sha256_count += 1
            sha256_users.append({
                "id": user.get("id"),
                "email": user.get("email"),
                "role": user.get("role")
            })
        elif password.startswith("$2b$") or password.startswith("$2a$"):
            bcrypt_count += 1
            bcrypt_users.append({
                "id": user.get("id"),
                "email": user.get("email")
            })
        else:
            other_count += 1
    
    print(f"\nTotal Users: {len(users)}")
    print(f"SHA256 hashes (needs migration): {sha256_count}")
    print(f"Bcrypt hashes (already migrated): {bcrypt_count}")
    print(f"Other hashes: {other_count}")
    print(f"No password: {empty_count}")
    
    print(f"\nMigration Status: {(bcrypt_count / len(users) * 100) if users else 0:.1f}% complete")
    
    return {
        "total": len(users),
        "sha256": sha256_count,
        "bcrypt": bcrypt_count,
        "other": other_count,
        "empty": empty_count,
        "sha256_users": sha256_users,
        "bcrypt_users": bcrypt_users
    }


async def migrate_lazy():
    """
    Lazy Migration: Mark users for upgrade on next login
    
    When user logs in with SHA256 hash, system will:
    1. Verify with SHA256 temporarily
    2. Hash new bcrypt version
    3. Store bcrypt hash
    4. Mark completion
    
    This requires code change in login endpoint (see below)
    """
    print("\n" + "="*80)
    print("LAZY MIGRATION: Mark users for password upgrade on login")
    print("="*80)
    
    users = await db.users.find({}, {"_id": 0}).to_list(None)
    
    migration_needed = 0
    
    for user in users:
        password = user.get("password") or user.get("password_hash")
        
        if await is_sha256_hash(password):
            # Mark user for upgrade on next login
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {
                    "password_hash_needs_upgrade": True,
                    "password_upgrade_marked_at": datetime.now(timezone.utc),
                    "password_upgrade_method": "lazy_migration"
                }}
            )
            migration_needed += 1
    
    print(f"✅ Marked {migration_needed} users for password upgrade on next login")
    print("\nWhat happens next:")
    print("1. When user logs in, system detects SHA256 hash")
    print("2. Verifies password using SHA256 temporarily")
    print("3. Hashes with bcrypt and stores new hash")
    print("4. User continues normally")
    print("5. Gradual, zero-downtime migration")
    
    return migration_needed


async def migrate_force():
    """
    Force Migration: Immediately upgrade all passwords
    
    WARNING: This requires users to reset passwords as bcrypt
    verification will fail on old SHA256 hashes
    """
    print("\n" + "="*80)
    print("FORCE MIGRATION: Immediately upgrade all passwords")
    print("="*80)
    print("⚠️  WARNING: Users will be locked out until password reset!\n")
    
    confirm = input("Continue with force migration? (yes/no): ")
    if confirm.lower() != "yes":
        print("Migration cancelled.")
        return 0
    
    users = await db.users.find({}, {"_id": 0}).to_list(None)
    
    migrated = 0
    for user in users:
        password = user.get("password") or user.get("password_hash")
        
        if await is_sha256_hash(password):
            # Generate temporary bcrypt hash for now-invalid password
            # This will force password reset on next login
            temp_password = "FORCE_RESET_REQUIRED"
            new_hash = hash_password(temp_password)
            
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {
                    "password_hash": new_hash,
                    "password_force_reset": True,
                    "password_migrated_at": datetime.now(timezone.utc),
                    "password_migration_method": "force_migration"
                }}
            )
            migrated += 1
    
    print(f"✅ Force migrated {migrated} users")
    print("\nNext steps:")
    print("1. Notify users of password reset requirement")
    print("2. Users attempt login")
    print("3. System detects password_force_reset flag")
    print("4. Prompt user to reset password")
    print("5. User sets new password (bcrypt hashed)")
    
    return migrated


async def verify_migration():
    """Verify migration completed successfully"""
    print("\n" + "="*80)
    print("MIGRATION VERIFICATION")
    print("="*80)
    
    analysis = await analyze_passwords()
    
    if analysis["sha256"] == 0:
        print("\n✅ MIGRATION COMPLETE!")
        print(f"   All {analysis['bcrypt']} users have bcrypt hashes")
        return True
    else:
        print(f"\n⏳ Migration in progress: {analysis['sha256']} users still need upgrade")
        return False


async def show_migration_code():
    """Show code changes needed in server.py for lazy migration"""
    print("\n" + "="*80)
    print("CODE CHANGES REQUIRED FOR LAZY MIGRATION")
    print("="*80)
    
    code = '''
# Add this code to the login endpoint in server.py
# After password verification

# Check if password needs bcrypt upgrade
if user.get("password_hash_needs_upgrade"):
    # Verify with SHA256 temporarily (backward compatibility)
    import hashlib
    sha256_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
    
    if sha256_hash == (user.get("password") or user.get("password_hash")):
        # Correct password! Now upgrade to bcrypt
        new_bcrypt_hash = hash_password(credentials.password)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "password_hash": new_bcrypt_hash,
                "password_hash_needs_upgrade": False,
                "password_upgraded_at": datetime.now(timezone.utc)
            }}
        )
        print(f"✅ User {user['email']} password upgraded to bcrypt on login")
'''
    
    print(code)
    
    # Save to file
    code_file = Path(__file__).parent / "password_migration_code.txt"
    code_file.write_text(code)
    print(f"\n💾 Code saved to: password_migration_code.txt")


async def main():
    """Main migration flow"""
    print("\n" + "="*80)
    print("PASSWORD MIGRATION TOOL: SHA256 → BCRYPT")
    print("="*80)
    print("\nThis tool helps migrate passwords from insecure SHA256 to secure bcrypt")
    
    # Step 1: Analyze current state
    analysis = await analyze_passwords()
    
    if analysis["sha256"] == 0:
        print("\n✅ No SHA256 hashes found - migration already complete!")
        return
    
    # Step 2: Show options
    print("\n" + "-"*80)
    print("MIGRATION OPTIONS")
    print("-"*80)
    print("\n1. Lazy Migration (RECOMMENDED)")
    print("   - Passwords upgraded on next login")
    print("   - Users don't notice anything")
    print("   - Zero downtime")
    print("   - Requires code change in login endpoint")
    
    print("\n2. Force Migration")
    print("   - All passwords upgraded immediately")
    print("   - Users forced to reset password")
    print("   - Can cause user frustration")
    print("   - Requires notification to users")
    
    print("\n3. View Code Changes")
    print("   - Show code needed for lazy migration")
    
    print("\n4. Verify Migration Status")
    print("   - Check current migration progress")
    
    print("\n5. Exit")
    
    # Step 3: Get user choice
    choice = input("\nChoose option (1-5): ").strip()
    
    if choice == "1":
        migrated = await migrate_lazy()
        await verify_migration()
    elif choice == "2":
        migrated = await migrate_force()
        await verify_migration()
    elif choice == "3":
        await show_migration_code()
    elif choice == "4":
        await verify_migration()
    elif choice == "5":
        print("Exiting...")
        return
    else:
        print("Invalid option")
        return
    
    print("\n" + "="*80)
    print("MIGRATION COMPLETE")
    print("="*80)


if __name__ == "__main__":
    # Connect to database
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nMigration cancelled by user")
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()

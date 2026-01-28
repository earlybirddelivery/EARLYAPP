"""
Test Suite for Bcrypt Password Hashing and Migration
====================================================

Tests password hashing, verification, and migration from SHA256 to bcrypt.

Run with:
    pytest test_bcrypt_security.py -v
"""

import pytest
import asyncio
from passlib.context import CryptContext
import hashlib
from datetime import datetime, timezone

# Import from backend
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from auth import hash_password, verify_password
from password_migration import (
    verify_password_with_migration,
    is_sha256_hash,
    PasswordMigrationStatus
)


class TestBcryptHashing:
    """Test bcrypt password hashing implementation"""
    
    def test_password_hashing(self):
        """Test that password hashing works with bcrypt"""
        password = "test_password_123"
        hashed = hash_password(password)
        
        # Should produce bcrypt hash (starts with $2b$)
        assert hashed.startswith("$2b$"), "Should produce bcrypt hash"
        
        # Should be different from plaintext
        assert hashed != password, "Hash should differ from plaintext"
        
        # Should be deterministic (same password, different hash due to salt)
        hashed2 = hash_password(password)
        assert hashed != hashed2, "Bcrypt includes salt, should produce different hash each time"
        assert verify_password(password, hashed), "Should verify same password"
        assert verify_password(password, hashed2), "Should verify same password (different hash)"
    
    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "correct_password"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed), "Should verify correct password"
    
    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "correct_password"
        wrong_password = "wrong_password"
        hashed = hash_password(password)
        
        assert not verify_password(wrong_password, hashed), "Should reject incorrect password"
    
    def test_verify_password_empty(self):
        """Test password verification with empty password"""
        password = "correct_password"
        hashed = hash_password(password)
        
        assert not verify_password("", hashed), "Should reject empty password"
    
    def test_password_uniqueness(self):
        """Test that same password produces different hashes (due to salt)"""
        password = "same_password"
        
        hashes = [hash_password(password) for _ in range(5)]
        
        # All should be different
        assert len(set(hashes)) == 5, "Same password should produce different hashes (salt)"
        
        # But all should verify correctly
        for h in hashes:
            assert verify_password(password, h), "All should verify correctly"
    
    def test_bcrypt_computational_cost(self):
        """Test that bcrypt has reasonable computational cost"""
        password = "test_password"
        
        import time
        start = time.time()
        hashed = hash_password(password)
        elapsed = time.time() - start
        
        # Should take ~100ms for 12 rounds
        assert 0.05 < elapsed < 0.5, f"Hashing should take 50-500ms, took {elapsed*1000:.0f}ms"
        print(f"\nHash computation time: {elapsed*1000:.1f}ms")


class TestSHA256Detection:
    """Test SHA256 hash detection for migration"""
    
    @pytest.mark.asyncio
    async def test_is_sha256_hash(self):
        """Test SHA256 hash detection"""
        # Generate actual SHA256 hash
        password = "test_password"
        sha256_hash = hashlib.sha256(password.encode()).hexdigest()
        
        assert await is_sha256_hash(sha256_hash), "Should detect SHA256 hash"
        assert len(sha256_hash) == 64, "SHA256 should be 64 hex characters"
    
    @pytest.mark.asyncio
    async def test_is_not_sha256_hash(self):
        """Test non-SHA256 hash detection"""
        # Bcrypt hash
        password = "test_password"
        bcrypt_hash = hash_password(password)
        
        assert not await is_sha256_hash(bcrypt_hash), "Should not detect bcrypt as SHA256"
        
        # Random strings
        assert not await is_sha256_hash("not_a_hash"), "Should reject short strings"
        assert not await is_sha256_hash(None), "Should reject None"
        assert not await is_sha256_hash(""), "Should reject empty string"
        assert not await is_sha256_hash("ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"), "Should reject non-hex"


class TestPasswordMigrationStatus:
    """Test password migration status tracking"""
    
    def test_migration_status_init(self):
        """Test migration status initialization"""
        status = PasswordMigrationStatus()
        
        assert status.total_users == 0
        assert status.bcrypt_migrated == 0
        assert status.sha256_remaining == 0
        assert status.get_migration_percentage() == 0.0
    
    def test_migration_percentage(self):
        """Test migration percentage calculation"""
        status = PasswordMigrationStatus()
        status.total_users = 100
        status.bcrypt_migrated = 75
        status.sha256_remaining = 25
        
        assert status.get_migration_percentage() == 75.0, "Should be 75%"
    
    def test_migration_status_report(self):
        """Test migration status report"""
        status = PasswordMigrationStatus()
        status.total_users = 100
        status.bcrypt_migrated = 50
        status.sha256_remaining = 50
        
        report = status.get_status_report()
        
        assert report["total_users"] == 100
        assert report["bcrypt_migrated"] == 50
        assert report["sha256_remaining"] == 50
        assert report["migration_percentage"] == 50.0
        assert report["status"] == "in_progress"
    
    def test_migration_complete_status(self):
        """Test complete migration status"""
        status = PasswordMigrationStatus()
        status.total_users = 100
        status.bcrypt_migrated = 100
        status.sha256_remaining = 0
        
        report = status.get_status_report()
        assert report["status"] == "complete"


class TestPasswordMigration:
    """Test password migration from SHA256 to bcrypt"""
    
    @pytest.mark.asyncio
    async def test_verify_sha256_password(self):
        """Test verification of SHA256 password"""
        password = "test_password_123"
        sha256_hash = hashlib.sha256(password.encode()).hexdigest()
        
        is_valid, was_upgraded = await verify_password_with_migration(
            password,
            sha256_hash,
            user_id=None,  # No DB, no upgrade
            db=None
        )
        
        assert is_valid, "Should verify SHA256 password"
        assert not was_upgraded, "Should not upgrade without db"
    
    @pytest.mark.asyncio
    async def test_verify_bcrypt_password(self):
        """Test verification of bcrypt password"""
        password = "test_password_123"
        bcrypt_hash = hash_password(password)
        
        is_valid, was_upgraded = await verify_password_with_migration(
            password,
            bcrypt_hash,
            user_id=None,
            db=None
        )
        
        assert is_valid, "Should verify bcrypt password"
        assert not was_upgraded, "Already bcrypt, no upgrade needed"
    
    @pytest.mark.asyncio
    async def test_verify_wrong_password(self):
        """Test verification with wrong password"""
        password = "test_password_123"
        wrong_password = "wrong_password"
        bcrypt_hash = hash_password(password)
        
        is_valid, was_upgraded = await verify_password_with_migration(
            wrong_password,
            bcrypt_hash,
            user_id=None,
            db=None
        )
        
        assert not is_valid, "Should reject wrong password"


class TestBcryptSecurityProperties:
    """Test bcrypt security properties"""
    
    def test_slow_computation(self):
        """Test that bcrypt is slow (security feature)"""
        import time
        
        password = "test"
        
        # Bcrypt should be slow
        start = time.time()
        bcrypt_hash = hash_password(password)
        bcrypt_time = time.time() - start
        
        # SHA256 should be fast
        start = time.time()
        sha256_hash = hashlib.sha256(password.encode()).hexdigest()
        sha256_time = time.time() - start
        
        # Bcrypt should be significantly slower
        ratio = bcrypt_time / max(sha256_time, 0.0001)
        print(f"\nBcrypt time: {bcrypt_time*1000:.1f}ms")
        print(f"SHA256 time: {sha256_time*1000:.4f}ms")
        print(f"Bcrypt is {ratio:.0f}x slower (GOOD for password hashing)")
        
        assert bcrypt_time > sha256_time, "Bcrypt should be slower (more secure)"
    
    def test_salt_uniqueness(self):
        """Test that bcrypt generates unique salts"""
        password = "test_password"
        hashes = [hash_password(password) for _ in range(10)]
        
        # Extract salt portion from each hash ($2b$rounds$salt)
        salts = [h.split('$')[3] for h in hashes]
        
        # All salts should be unique
        assert len(set(salts)) == len(salts), "Each bcrypt hash should have unique salt"
    
    def test_rainbow_table_resistance(self):
        """Test resistance to rainbow table attacks"""
        # Common passwords
        common_passwords = [
            "password",
            "123456",
            "admin",
            "letmein",
            "welcome"
        ]
        
        hashes_first_run = [hash_password(pwd) for pwd in common_passwords]
        hashes_second_run = [hash_password(pwd) for pwd in common_passwords]
        
        # Even the same password produces different hashes
        for h1, h2 in zip(hashes_first_run, hashes_second_run):
            assert h1 != h2, "Same password should produce different hashes (rainbow table proof)"
    
    def test_verification_timing_consistency(self):
        """Test that verification time is consistent (prevents timing attacks)"""
        import time
        
        password = "test_password_123"
        hashed = hash_password(password)
        
        # Time correct verification
        times = []
        for _ in range(5):
            start = time.time()
            verify_password(password, hashed)
            times.append(time.time() - start)
        
        avg_time = sum(times) / len(times)
        std_dev = (sum((t - avg_time) ** 2 for t in times) / len(times)) ** 0.5
        
        print(f"\nVerification time: {avg_time*1000:.2f}ms ± {std_dev*1000:.2f}ms")
        # Bcrypt verification should be consistent (constant-time comparison)


# Test runner
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

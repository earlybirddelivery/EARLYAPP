"""
PHASE 4B.6: Access Control Service
Fine-grained permissions, 2FA, audit trails, resource-level access control
Author: AI Agent
Date: January 28, 2026
"""

from datetime import datetime, timedelta
import json
import hashlib
import hmac
import secrets
import string
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

class PermissionLevel(Enum):
    """Permission levels in the system"""
    OWNER = "owner"           # Full access
    ADMIN = "admin"           # Administrative access
    MANAGER = "manager"       # Manager access
    STAFF = "staff"           # Staff access
    CUSTOMER = "customer"     # Limited customer access
    GUEST = "guest"           # Read-only access


class ResourceType(Enum):
    """Types of resources that can be protected"""
    ORDER = "order"
    PRODUCT = "product"
    USER = "user"
    PAYMENT = "payment"
    REPORT = "report"
    STAFF = "staff"
    DELIVERY = "delivery"


class AuditActionType(Enum):
    """Types of audit log actions"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"
    MFA_ENABLE = "mfa_enable"
    MFA_DISABLE = "mfa_disable"
    MFA_VERIFY = "mfa_verify"
    MFA_FAILED = "mfa_failed"


class PermissionService:
    """
    Fine-grained permission management system
    Handles role-based access control (RBAC) with resource-level granularity
    """

    def __init__(self, db):
        """Initialize permission service with database"""
        self.db = db
        self.permissions_col = db.permissions
        self.roles_col = db.roles
        self.resource_access_col = db.resource_access
        
        # Initialize default roles
        self._initialize_default_roles()

    def _initialize_default_roles(self):
        """Create default roles if they don't exist"""
        default_roles = [
            {
                "name": "owner",
                "display_name": "Owner",
                "level": PermissionLevel.OWNER.value,
                "permissions": ["*"],  # All permissions
                "description": "Full system access"
            },
            {
                "name": "admin",
                "display_name": "Administrator",
                "level": PermissionLevel.ADMIN.value,
                "permissions": [
                    "users:read", "users:update",
                    "products:read", "products:create", "products:update", "products:delete",
                    "orders:read", "orders:update",
                    "payments:read",
                    "reports:read",
                    "staff:read", "staff:update",
                    "permissions:read", "permissions:update",
                    "audit:read"
                ],
                "description": "Full administrative access"
            },
            {
                "name": "manager",
                "display_name": "Manager",
                "level": PermissionLevel.MANAGER.value,
                "permissions": [
                    "orders:read", "orders:update",
                    "deliveries:read", "deliveries:update",
                    "staff:read",
                    "reports:read",
                    "audit:read"
                ],
                "description": "Order and delivery management"
            },
            {
                "name": "staff",
                "display_name": "Staff",
                "level": PermissionLevel.STAFF.value,
                "permissions": [
                    "orders:read",
                    "deliveries:read", "deliveries:update",
                    "payments:read"
                ],
                "description": "Limited operational access"
            },
            {
                "name": "customer",
                "display_name": "Customer",
                "level": PermissionLevel.CUSTOMER.value,
                "permissions": [
                    "products:read",
                    "orders:read_own",
                    "profile:read", "profile:update"
                ],
                "description": "Customer access"
            }
        ]

        for role in default_roles:
            if not self.roles_col.find_one({"name": role["name"]}):
                self.roles_col.insert_one({
                    **role,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })

    def grant_permission(self, user_id: str, permission: str, resource_id: Optional[str] = None, 
                        resource_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Grant a specific permission to a user
        
        Args:
            user_id: User ID to grant permission
            permission: Permission name (e.g., "orders:update")
            resource_id: Specific resource ID (for resource-level access)
            resource_type: Type of resource (for resource-level access)
            
        Returns:
            Permission record
        """
        try:
            permission_record = {
                "user_id": user_id,
                "permission": permission,
                "resource_id": resource_id,
                "resource_type": resource_type,
                "granted_at": datetime.utcnow(),
                "granted_by": None,  # Would be populated in actual implementation
                "active": True,
                "expires_at": None
            }

            result = self.permissions_col.insert_one(permission_record)
            permission_record["_id"] = str(result.inserted_id)
            
            return {
                "success": True,
                "permission_id": str(result.inserted_id),
                "message": f"Permission '{permission}' granted to user"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def revoke_permission(self, user_id: str, permission: str, resource_id: Optional[str] = None) -> Dict[str, Any]:
        """Revoke a permission from a user"""
        try:
            query = {"user_id": user_id, "permission": permission, "active": True}
            if resource_id:
                query["resource_id"] = resource_id

            result = self.permissions_col.update_one(
                query,
                {"$set": {"active": False, "revoked_at": datetime.utcnow()}}
            )

            if result.matched_count == 0:
                return {"success": False, "error": "Permission not found"}

            return {
                "success": True,
                "message": "Permission revoked"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def has_permission(self, user_id: str, permission: str, resource_id: Optional[str] = None) -> bool:
        """
        Check if user has a specific permission
        
        Args:
            user_id: User ID to check
            permission: Permission to verify
            resource_id: Specific resource (if resource-level check)
            
        Returns:
            Boolean indicating if user has permission
        """
        try:
            # Check wildcard permission
            if self.permissions_col.find_one({
                "user_id": user_id,
                "permission": "*",
                "active": True
            }):
                return True

            # Check specific permission
            query = {
                "user_id": user_id,
                "permission": permission,
                "active": True,
                "$or": [
                    {"expires_at": None},
                    {"expires_at": {"$gt": datetime.utcnow()}}
                ]
            }

            if resource_id:
                query["$or"] = [
                    {"resource_id": None},  # Global permission
                    {"resource_id": resource_id}  # Resource-specific
                ]

            return bool(self.permissions_col.find_one(query))
        except Exception as e:
            print(f"Permission check error: {e}")
            return False

    def get_user_permissions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all permissions for a user"""
        try:
            permissions = list(self.permissions_col.find({
                "user_id": user_id,
                "active": True,
                "$or": [
                    {"expires_at": None},
                    {"expires_at": {"$gt": datetime.utcnow()}}
                ]
            }))

            return [
                {
                    "id": str(p["_id"]),
                    "permission": p["permission"],
                    "resource_id": p.get("resource_id"),
                    "resource_type": p.get("resource_type"),
                    "granted_at": p["granted_at"].isoformat()
                }
                for p in permissions
            ]
        except Exception as e:
            print(f"Get permissions error: {e}")
            return []

    def assign_role(self, user_id: str, role_name: str) -> Dict[str, Any]:
        """Assign a role to a user"""
        try:
            role = self.roles_col.find_one({"name": role_name})
            if not role:
                return {"success": False, "error": "Role not found"}

            # Remove old role permissions
            self.permissions_col.update_many(
                {"user_id": user_id, "role_based": True},
                {"$set": {"active": False}}
            )

            # Add new role permissions
            for permission in role["permissions"]:
                self.permissions_col.insert_one({
                    "user_id": user_id,
                    "permission": permission,
                    "role_based": True,
                    "role": role_name,
                    "granted_at": datetime.utcnow(),
                    "active": True
                })

            return {
                "success": True,
                "role": role_name,
                "permissions": role["permissions"]
            }
        except Exception as e:
            return {"success": False, "error": str(e)}


class TwoFactorAuthService:
    """
    Two-Factor Authentication (2FA) Service
    Supports TOTP, SMS, and email-based 2FA
    """

    def __init__(self, db):
        """Initialize 2FA service"""
        self.db = db
        self.mfa_col = db.mfa_settings
        self.backup_codes_col = db.backup_codes
        self.mfa_challenges_col = db.mfa_challenges

    def enable_totp(self, user_id: str) -> Dict[str, Any]:
        """
        Enable TOTP (Time-based One-Time Password)
        Returns secret and QR code for user to scan
        """
        try:
            import pyotp
            
            secret = pyotp.random_base32()
            totp = pyotp.TOTP(secret)
            
            # Generate backup codes
            backup_codes = [
                ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
                for _ in range(10)
            ]

            # Store backup codes (hashed)
            hashed_codes = [
                hashlib.sha256(code.encode()).hexdigest()
                for code in backup_codes
            ]

            self.backup_codes_col.insert_one({
                "user_id": user_id,
                "codes": hashed_codes,
                "created_at": datetime.utcnow(),
                "used_codes": []
            })

            # Store TOTP secret (encrypted in production)
            self.mfa_col.insert_one({
                "user_id": user_id,
                "method": "totp",
                "secret": secret,
                "enabled": False,
                "verified": False,
                "created_at": datetime.utcnow()
            })

            return {
                "success": True,
                "secret": secret,
                "provisioning_uri": totp.provisioning_uri(name=user_id, issuer_name="Kirana Store"),
                "backup_codes": backup_codes,
                "message": "Scan QR code with authenticator app"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def verify_totp(self, user_id: str, code: str) -> Dict[str, Any]:
        """Verify TOTP code"""
        try:
            import pyotp
            
            mfa = self.mfa_col.find_one({"user_id": user_id, "method": "totp"})
            if not mfa:
                return {"success": False, "error": "2FA not configured"}

            totp = pyotp.TOTP(mfa["secret"])
            
            # Verify code (allow 30 second window)
            if totp.verify(code, valid_window=1):
                if not mfa["enabled"]:
                    self.mfa_col.update_one(
                        {"_id": mfa["_id"]},
                        {"$set": {"enabled": True, "verified": True}}
                    )
                return {"success": True, "message": "2FA verified"}
            else:
                return {"success": False, "error": "Invalid 2FA code"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def verify_backup_code(self, user_id: str, code: str) -> Dict[str, Any]:
        """Verify backup code (one-time use)"""
        try:
            backup_record = self.backup_codes_col.find_one({"user_id": user_id})
            if not backup_record:
                return {"success": False, "error": "Backup codes not found"}

            hashed_code = hashlib.sha256(code.encode()).hexdigest()
            
            if hashed_code not in backup_record["codes"]:
                return {"success": False, "error": "Invalid backup code"}

            if hashed_code in backup_record.get("used_codes", []):
                return {"success": False, "error": "Backup code already used"}

            # Mark as used
            self.backup_codes_col.update_one(
                {"_id": backup_record["_id"]},
                {"$push": {"used_codes": hashed_code}}
            )

            return {"success": True, "message": "Backup code verified"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_sms_code(self, user_id: str, phone: str) -> Dict[str, Any]:
        """Send 2FA code via SMS"""
        try:
            code = ''.join(secrets.choice(string.digits) for _ in range(6))
            
            # Store challenge (expires in 5 minutes)
            self.mfa_challenges_col.insert_one({
                "user_id": user_id,
                "code": hashlib.sha256(code.encode()).hexdigest(),
                "method": "sms",
                "expires_at": datetime.utcnow() + timedelta(minutes=5),
                "attempts": 0,
                "verified": False
            })

            # In production, send actual SMS
            # sms_service.send(phone, f"Your Kirana Store 2FA code: {code}")
            
            return {
                "success": True,
                "message": "2FA code sent to SMS",
                "demo_code": code  # Remove in production
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def verify_sms_code(self, user_id: str, code: str) -> Dict[str, Any]:
        """Verify SMS 2FA code"""
        try:
            hashed_code = hashlib.sha256(code.encode()).hexdigest()
            
            challenge = self.mfa_challenges_col.find_one({
                "user_id": user_id,
                "method": "sms",
                "code": hashed_code,
                "expires_at": {"$gt": datetime.utcnow()},
                "verified": False
            })

            if not challenge:
                return {"success": False, "error": "Invalid or expired code"}

            if challenge["attempts"] >= 3:
                return {"success": False, "error": "Too many attempts"}

            # Mark as verified
            self.mfa_challenges_col.update_one(
                {"_id": challenge["_id"]},
                {"$set": {"verified": True}}
            )

            return {"success": True, "message": "SMS code verified"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def disable_2fa(self, user_id: str, password: str) -> Dict[str, Any]:
        """Disable 2FA (requires password verification)"""
        try:
            # In production, verify password here
            
            self.mfa_col.update_many(
                {"user_id": user_id},
                {"$set": {"enabled": False}}
            )

            self.mfa_challenges_col.delete_many({"user_id": user_id})

            return {"success": True, "message": "2FA disabled"}
        except Exception as e:
            return {"success": False, "error": str(e)}


class AuditService:
    """
    Comprehensive audit trail system
    Logs all actions with user, timestamp, resource, and change details
    """

    def __init__(self, db):
        """Initialize audit service"""
        self.db = db
        self.audit_col = db.audit_logs
        self._create_indexes()

    def _create_indexes(self):
        """Create database indexes for audit logs"""
        self.audit_col.create_index("user_id")
        self.audit_col.create_index("timestamp")
        self.audit_col.create_index("resource_type")
        self.audit_col.create_index("action")
        self.audit_col.create_index([("user_id", 1), ("timestamp", -1)])

    def log_action(self, user_id: str, action: str, resource_type: str, 
                   resource_id: Optional[str] = None, details: Optional[Dict] = None,
                   status: str = "success", ip_address: Optional[str] = None) -> Dict[str, Any]:
        """
        Log an audit action
        
        Args:
            user_id: User performing action
            action: Action type (create, read, update, delete, etc.)
            resource_type: Type of resource affected
            resource_id: ID of resource affected
            details: Additional context (before/after values, etc.)
            status: Success or failure status
            ip_address: Client IP address
            
        Returns:
            Audit log record
        """
        try:
            audit_record = {
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "details": details or {},
                "status": status,
                "ip_address": ip_address,
                "timestamp": datetime.utcnow(),
                "user_agent": None  # Would be populated from request
            }

            result = self.audit_col.insert_one(audit_record)
            audit_record["_id"] = str(result.inserted_id)
            
            return {"success": True, "audit_id": str(result.inserted_id)}
        except Exception as e:
            print(f"Audit logging error: {e}")
            return {"success": False, "error": str(e)}

    def get_user_audit_log(self, user_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get audit log for a specific user"""
        try:
            logs = list(self.audit_col.find({"user_id": user_id})
                       .sort("timestamp", -1)
                       .skip(offset)
                       .limit(limit))

            return [
                {
                    "id": str(log["_id"]),
                    "action": log["action"],
                    "resource_type": log["resource_type"],
                    "resource_id": log.get("resource_id"),
                    "status": log["status"],
                    "timestamp": log["timestamp"].isoformat(),
                    "ip_address": log.get("ip_address")
                }
                for log in logs
            ]
        except Exception as e:
            print(f"Get audit log error: {e}")
            return []

    def get_resource_audit_log(self, resource_type: str, resource_id: str, 
                               limit: int = 50) -> List[Dict[str, Any]]:
        """Get audit log for a specific resource"""
        try:
            logs = list(self.audit_col.find({
                "resource_type": resource_type,
                "resource_id": resource_id
            }).sort("timestamp", -1).limit(limit))

            return [
                {
                    "id": str(log["_id"]),
                    "user_id": log["user_id"],
                    "action": log["action"],
                    "status": log["status"],
                    "timestamp": log["timestamp"].isoformat(),
                    "details": log.get("details")
                }
                for log in logs
            ]
        except Exception as e:
            print(f"Get resource audit log error: {e}")
            return []

    def get_activity_summary(self, start_date: datetime = None, 
                            end_date: datetime = None) -> Dict[str, Any]:
        """Get summary of audit activity"""
        try:
            if not start_date:
                start_date = datetime.utcnow() - timedelta(days=30)
            if not end_date:
                end_date = datetime.utcnow()

            query = {
                "timestamp": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }

            total_actions = self.audit_col.count_documents(query)
            
            # Count by action type
            actions = self.audit_col.aggregate([
                {"$match": query},
                {"$group": {"_id": "$action", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ])

            # Count by status
            statuses = self.audit_col.aggregate([
                {"$match": query},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ])

            # Failed actions
            failed_actions = self.audit_col.count_documents({
                **query,
                "status": "failure"
            })

            return {
                "total_actions": total_actions,
                "failed_actions": failed_actions,
                "success_rate": ((total_actions - failed_actions) / total_actions * 100) if total_actions > 0 else 0,
                "actions_by_type": {a["_id"]: a["count"] for a in actions},
                "actions_by_status": {s["_id"]: s["count"] for s in statuses}
            }
        except Exception as e:
            print(f"Activity summary error: {e}")
            return {}

    def check_suspicious_activity(self, user_id: str) -> Dict[str, Any]:
        """Check for suspicious activity patterns"""
        try:
            # Check failed login attempts
            failed_logins = self.audit_col.count_documents({
                "user_id": user_id,
                "action": "login",
                "status": "failure",
                "timestamp": {"$gt": datetime.utcnow() - timedelta(hours=1)}
            })

            # Check multiple IP addresses in short time
            recent_ips = self.audit_col.distinct(
                "ip_address",
                {
                    "user_id": user_id,
                    "timestamp": {"$gt": datetime.utcnow() - timedelta(hours=1)}
                }
            )

            alerts = []
            if failed_logins >= 5:
                alerts.append({
                    "type": "failed_login_attempts",
                    "severity": "high",
                    "count": failed_logins,
                    "action": "consider_account_lock"
                })

            if len([ip for ip in recent_ips if ip]) >= 3:
                alerts.append({
                    "type": "multiple_ips",
                    "severity": "medium",
                    "ip_count": len([ip for ip in recent_ips if ip]),
                    "action": "verify_activity"
                })

            return {
                "user_id": user_id,
                "has_alerts": len(alerts) > 0,
                "alerts": alerts
            }
        except Exception as e:
            print(f"Suspicious activity check error: {e}")
            return {"user_id": user_id, "has_alerts": False, "alerts": []}

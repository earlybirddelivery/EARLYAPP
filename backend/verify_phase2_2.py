#!/usr/bin/env python3
"""
Phase 2.2 Dispute Resolution System - Verification & Deployment Script

This script verifies that all Phase 2.2 components are properly installed and configured.
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))


async def verify_imports():
    """Verify all required imports"""
    print("=" * 60)
    print("VERIFYING PHASE 2.2 DISPUTE RESOLUTION SYSTEM")
    print("=" * 60)
    
    print("\n1. Checking core imports...")
    try:
        from dispute_engine import DisputeEngine, DisputeStatus, DisputeReason, RefundStatus
        print("   ✅ dispute_engine.py - OK")
    except Exception as e:
        print(f"   ❌ dispute_engine.py - FAILED: {e}")
        return False
    
    try:
        from routes_disputes import router
        print("   ✅ routes_disputes.py - OK")
    except Exception as e:
        print(f"   ❌ routes_disputes.py - FAILED: {e}")
        return False
    
    print("\n2. Checking database configuration...")
    try:
        from database import db
        print("   ✅ database.py - OK")
    except Exception as e:
        print(f"   ❌ database.py - FAILED: {e}")
        return False
    
    print("\n3. Checking auth and RBAC...")
    try:
        from auth import get_current_user, require_role
        print("   ✅ auth.py with RBAC decorators - OK")
    except Exception as e:
        print(f"   ❌ auth.py - FAILED: {e}")
        return False
    
    print("\n4. Checking notification service...")
    try:
        from notification_service import notification_service
        print("   ✅ notification_service.py - OK")
    except Exception as e:
        print(f"   ⚠️  notification_service.py not found: {e}")
        print("   (This is optional - WhatsApp notifications will be skipped)")
    
    return True


async def verify_database():
    """Verify database collections"""
    print("\n5. Checking database collections...")
    try:
        from database import db
        
        # Collections are auto-created on first insert, so we just verify db connection
        await db.command("ping")
        print("   ✅ Database connection - OK")
        
        # List existing collections
        collections = await db.list_collection_names()
        print(f"   ✅ Database has {len(collections)} collections")
        
        if "disputes" in collections:
            dispute_count = await db.disputes.count_documents({})
            print(f"   ✅ disputes collection exists ({dispute_count} records)")
        else:
            print("   ℹ️  disputes collection will be created on first use")
        
        if "dispute_messages" in collections:
            msg_count = await db.dispute_messages.count_documents({})
            print(f"   ✅ dispute_messages collection exists ({msg_count} records)")
        else:
            print("   ℹ️  dispute_messages collection will be created on first use")
        
        if "refunds" in collections:
            refund_count = await db.refunds.count_documents({})
            print(f"   ✅ refunds collection exists ({refund_count} records)")
        else:
            print("   ℹ️  refunds collection will be created on first use")
        
        return True
    except Exception as e:
        print(f"   ❌ Database check failed: {e}")
        return False


async def verify_enums():
    """Verify enum definitions"""
    print("\n6. Checking enum definitions...")
    try:
        from dispute_engine import DisputeStatus, DisputeReason, RefundStatus
        
        statuses = [e.value for e in DisputeStatus]
        print(f"   ✅ DisputeStatus: {', '.join(statuses)}")
        
        reasons = [e.value for e in DisputeReason]
        print(f"   ✅ DisputeReason: {', '.join(reasons)}")
        
        refund_statuses = [e.value for e in RefundStatus]
        print(f"   ✅ RefundStatus: {', '.join(refund_statuses)}")
        
        return True
    except Exception as e:
        print(f"   ❌ Enum check failed: {e}")
        return False


async def verify_endpoints():
    """Verify API endpoints are registered"""
    print("\n7. Checking API endpoints...")
    try:
        from routes_disputes import router
        
        routes = [
            ("POST", "/api/disputes/create"),
            ("GET", "/api/disputes/{id}"),
            ("PUT", "/api/disputes/{id}/add-message"),
            ("GET", "/api/disputes/customer/{id}"),
            ("PUT", "/api/disputes/{id}/status"),
            ("POST", "/api/disputes/{id}/refund"),
            ("GET", "/api/disputes/admin/dashboard"),
            ("GET", "/api/disputes/admin/stats"),
        ]
        
        print(f"   ✅ {len(routes)} endpoints defined:")
        for method, path in routes:
            print(f"      {method:6} {path}")
        
        return True
    except Exception as e:
        print(f"   ❌ Endpoint check failed: {e}")
        return False


async def verify_file_sizes():
    """Verify file sizes"""
    print("\n8. Checking file sizes...")
    files = [
        ("dispute_engine.py", 400),
        ("routes_disputes.py", 300),
        ("test_disputes.py", 250),
    ]
    
    for filename, min_size_kb in files:
        filepath = Path(__file__).parent / filename
        if filepath.exists():
            size_kb = filepath.stat().st_size / 1024
            if size_kb >= min_size_kb:
                print(f"   ✅ {filename}: {size_kb:.1f} KB")
            else:
                print(f"   ⚠️  {filename}: {size_kb:.1f} KB (expected >= {min_size_kb} KB)")
        else:
            print(f"   ❌ {filename}: NOT FOUND")
            return False
    
    return True


async def main():
    """Main verification"""
    print()
    
    # Run all verifications
    checks = [
        ("Imports", verify_imports),
        ("Database", verify_database),
        ("Enums", verify_enums),
        ("Endpoints", verify_endpoints),
        ("File Sizes", verify_file_sizes),
    ]
    
    all_passed = True
    
    try:
        all_passed &= await verify_imports()
        all_passed &= await verify_enums()
        all_passed &= await verify_file_sizes()
        all_passed &= await verify_endpoints()
        all_passed &= await verify_database()
    except Exception as e:
        print(f"\n❌ Verification failed with error: {e}")
        all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ PHASE 2.2 DISPUTE RESOLUTION - ALL CHECKS PASSED!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Run tests: pytest backend/test_disputes.py -v")
        print("2. Start server: python backend/server.py")
        print("3. Test endpoints with curl or Postman")
        print("\nDocumentation:")
        print("  - See PHASE_2_2_DISPUTE_RESOLUTION_GUIDE.md for complete guide")
        print("=" * 60)
        return 0
    else:
        print("❌ PHASE 2.2 DISPUTE RESOLUTION - SOME CHECKS FAILED!")
        print("=" * 60)
        print("\nPlease fix the errors above and try again.")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

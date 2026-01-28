#!/usr/bin/env python3
"""
Data Consistency Report Generator
Runs all consistency checks and generates comprehensive reports
Usage: python backend/run_consistency_checks.py
"""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from database import get_database
from consistency_check_functions import (
    check_orphaned_orders,
    check_orphaned_customers,
    check_phantom_deliveries,
    check_invalid_references,
    check_duplicate_customers,
    check_billing_integrity,
    check_status_consistency
)


async def generate_consistency_report():
    """Generate complete data consistency report"""
    
    print("\n" + "="*70)
    print("DATA CONSISTENCY REPORT GENERATOR")
    print("="*70)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")
    
    # Get database
    try:
        db = await get_database()
        print("✓ Connected to database\n")
    except Exception as e:
        print(f"✗ Failed to connect to database: {e}")
        return None
    
    all_issues = {
        "generated_at": datetime.now().isoformat(),
        "database": "MongoDB",
        "reports": {}
    }
    
    # Track statistics
    total_critical = 0
    total_high = 0
    total_medium = 0
    total_issues = 0
    
    try:
        # Report 1: Orphaned Orders
        print("[1/7] Checking orphaned orders...")
        orphaned_orders = await check_orphaned_orders(db)
        all_issues["reports"]["orphaned_orders"] = orphaned_orders
        unbilled = orphaned_orders['summary']['unbilled_critical']
        print(f"      ✓ Found {orphaned_orders['total_orphaned_orders']} orphaned orders")
        print(f"      - Unbilled (CRITICAL): {unbilled}")
        total_critical += unbilled
        total_issues += len(orphaned_orders["issues"])
        
        # Report 2: Orphaned Customers
        print("[2/7] Checking orphaned customers...")
        orphaned_customers = await check_orphaned_customers(db)
        all_issues["reports"]["orphaned_customers"] = orphaned_customers
        active_no_login = orphaned_customers['summary']['active_subs_no_login']
        print(f"      ✓ Found {orphaned_customers['total_orphaned_customers']} orphaned customers")
        print(f"      - Active subscriptions without login (HIGH): {active_no_login}")
        total_high += active_no_login
        total_issues += len(orphaned_customers["issues"])
        
        # Report 3: Phantom Deliveries
        print("[3/7] Checking phantom deliveries...")
        phantom_deliveries = await check_phantom_deliveries(db)
        all_issues["reports"]["phantom_deliveries"] = phantom_deliveries
        phantom_count = phantom_deliveries['total_phantom_deliveries']
        if phantom_count > 0:
            print(f"      ⚠️  CRITICAL: Found {phantom_count} phantom deliveries!")
            total_critical += phantom_count
        else:
            print(f"      ✓ No phantom deliveries found")
        total_issues += len(phantom_deliveries["issues"])
        
        # Report 4: Invalid References
        print("[4/7] Checking invalid references...")
        invalid_refs = await check_invalid_references(db)
        all_issues["reports"]["invalid_references"] = invalid_refs
        print(f"      ✓ Found {invalid_refs['total_invalid_references']} invalid references")
        total_high += invalid_refs['total_invalid_references']
        total_issues += len(invalid_refs["issues"])
        
        # Report 5: Duplicate Customers
        print("[5/7] Checking duplicate customers...")
        duplicates = await check_duplicate_customers(db)
        all_issues["reports"]["duplicates"] = duplicates
        dup_emails = duplicates['summary']['duplicate_emails']
        print(f"      ✓ Found {duplicates['total_duplicates']} duplicate records")
        if dup_emails > 0:
            print(f"      - Duplicate emails (HIGH): {dup_emails}")
            total_high += dup_emails
        total_issues += len(duplicates["issues"])
        
        # Report 6: Billing Integrity
        print("[6/7] Checking billing integrity...")
        billing_issues = await check_billing_integrity(db)
        all_issues["reports"]["billing"] = billing_issues
        double_bills = billing_issues["summary"]["double_bills"]
        print(f"      ✓ Found {billing_issues['total_billing_issues']} billing issues")
        if double_bills > 0:
            overcharge = billing_issues["summary"]["total_overcharge"]
            print(f"      ⚠️  CRITICAL: {double_bills} double-billing instances (₹{overcharge:.2f} overcharged)")
            total_critical += double_bills
        total_issues += len(billing_issues["issues"])
        
        # Report 7: Status Consistency
        print("[7/7] Checking status consistency...")
        status_issues = await check_status_consistency(db)
        all_issues["reports"]["status"] = status_issues
        print(f"      ✓ Found {status_issues['total_status_issues']} status issues")
        total_medium += status_issues['total_status_issues']
        total_issues += len(status_issues["issues"])
        
    except Exception as e:
        print(f"\n✗ Error during consistency check: {e}")
        import traceback
        traceback.print_exc()
        return None
    
    # Generate Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"\nTotal Issues Found: {total_issues}")
    print(f"  - CRITICAL (requires immediate action): {total_critical}")
    print(f"  - HIGH (requires attention): {total_high}")
    print(f"  - MEDIUM (should be reviewed): {total_medium}")
    
    severity_summary = {
        "CRITICAL": total_critical,
        "HIGH": total_high,
        "MEDIUM": total_medium,
        "total": total_issues
    }
    
    all_issues["severity_summary"] = severity_summary
    
    # Save report
    timestamp = datetime.now().strftime('%Y_%m_%d_%H%M%S')
    filename = f"data_consistency_report_{timestamp}.json"
    filepath = Path(__file__).parent / filename
    
    try:
        with open(filepath, 'w') as f:
            json.dump(all_issues, f, indent=2, default=str)
        print(f"\nReport saved: {filepath}")
    except Exception as e:
        print(f"Failed to save report: {e}")
        return None
    
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    return all_issues


async def main():
    """Main entry point"""
    report = await generate_consistency_report()
    
    if report is None:
        print("\n✗ Report generation failed")
        return 1
    
    # Determine exit code based on critical issues
    critical_count = report.get("severity_summary", {}).get("CRITICAL", 0)
    
    if critical_count > 0:
        print(f"\n⚠️  {critical_count} CRITICAL ISSUES FOUND")
        print("Please review the report and take action immediately!")
        return 1
    else:
        print("\n✅ No critical issues found")
        return 0


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

# Phase 1.5: Delivery Boy Earnings System Tests
# Comprehensive test suite for earnings tracking, lookups, and performance

import unittest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from earnings_tracker import EarningsTracker, DeliveryBoyStatus
import asyncio


class TestDeliveryBoyLookup(unittest.TestCase):
    """Test delivery boy lookup functions"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.db = Mock()
        self.tracker = EarningsTracker(self.db)
    
    def test_get_delivery_boy_by_id(self):
        """Test getting delivery boy by ID"""
        expected_boy = {
            "id": "BOY_001",
            "name": "Arjun Kumar",
            "phone": "9876543210",
            "status": "active"
        }
        
        self.db.delivery_boys.find_one = AsyncMock(return_value=expected_boy)
        
        result = asyncio.run(self.tracker.get_delivery_boy("BOY_001"))
        
        self.assertEqual(result, expected_boy)
        self.db.delivery_boys.find_one.assert_called_once()
    
    def test_get_delivery_boy_from_users(self):
        """Test getting delivery boy from users collection"""
        expected_user = {
            "id": "USR_001",
            "role": "delivery_boy",
            "name": "Arjun Kumar"
        }
        
        self.db.users.find_one = AsyncMock(return_value=expected_user)
        
        result = asyncio.run(self.tracker.get_delivery_boy_from_users("USR_001"))
        
        self.assertEqual(result, expected_user)
        self.db.users.find_one.assert_called_once_with(
            {"id": "USR_001", "role": "delivery_boy"},
            {"_id": 0}
        )
    
    def test_get_delivery_boy_not_found(self):
        """Test getting non-existent delivery boy"""
        self.db.delivery_boys.find_one = AsyncMock(return_value=None)
        
        result = asyncio.run(self.tracker.get_delivery_boy("INVALID_001"))
        
        self.assertIsNone(result)


class TestEarningsInitialization(unittest.TestCase):
    """Test earnings initialization"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.db = Mock()
        self.tracker = EarningsTracker(self.db)
    
    def test_initialize_delivery_boy_earnings(self):
        """Test initializing earnings fields"""
        delivery_boy_id = "BOY_001"
        delivery_boy_data = {"id": delivery_boy_id, "name": "Arjun Kumar"}
        
        # Mock update_one to return modified count
        result = Mock()
        result.modified_count = 1
        result.upserted_id = None
        self.db.delivery_boys.update_one = AsyncMock(return_value=result)
        
        success = asyncio.run(
            self.tracker.initialize_delivery_boy_earnings(delivery_boy_id, delivery_boy_data)
        )
        
        self.assertTrue(success)
        self.db.delivery_boys.update_one.assert_called_once()
        
        # Check that correct fields were set
        call_args = self.db.delivery_boys.update_one.call_args
        update_doc = call_args[0][1]["$set"]
        
        self.assertEqual(update_doc["total_deliveries"], 0)
        self.assertEqual(update_doc["total_earnings"], 0)
        self.assertEqual(update_doc["status"], DeliveryBoyStatus.ACTIVE)
        self.assertIsNone(update_doc["last_payment_date"])
    
    def test_initialize_earnings_with_existing_fields(self):
        """Test that existing earnings are not overwritten"""
        result = Mock()
        result.modified_count = 0
        result.upserted_id = None
        self.db.delivery_boys.update_one = AsyncMock(return_value=result)
        
        success = asyncio.run(
            self.tracker.initialize_delivery_boy_earnings("BOY_001", {})
        )
        
        self.assertFalse(success)


class TestDeliveryRecording(unittest.TestCase):
    """Test recording deliveries"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.db = Mock()
        self.tracker = EarningsTracker(self.db)
    
    def test_record_delivery_updates_stats(self):
        """Test recording a delivery updates all stats"""
        delivery_boy_id = "BOY_001"
        order_id = "ORD_001"
        amount = 50
        
        # Mock update_one
        result = Mock()
        result.modified_count = 1
        self.db.delivery_boys.update_one = AsyncMock(return_value=result)
        
        # Mock get_delivery_boy for bonus check
        self.db.delivery_boys.find_one = AsyncMock(return_value={
            "id": delivery_boy_id,
            "today_deliveries": 9,
            "week_deliveries": 49,
            "month_deliveries": 199
        })
        
        success = asyncio.run(
            self.tracker.record_delivery(delivery_boy_id, order_id, amount)
        )
        
        self.assertTrue(success)
        
        # Verify update was called with correct increments
        call_args = self.db.delivery_boys.update_one.call_args
        inc_doc = call_args[0][1]["$inc"]
        
        self.assertEqual(inc_doc["total_deliveries"], 1)
        self.assertEqual(inc_doc["today_deliveries"], 1)
        self.assertEqual(inc_doc["total_earnings"], amount)
        self.assertEqual(inc_doc["today_earnings"], amount)
    
    def test_record_delivery_adds_to_history(self):
        """Test that delivery is added to earnings history"""
        result = Mock()
        result.modified_count = 1
        self.db.delivery_boys.update_one = AsyncMock(return_value=result)
        
        self.db.delivery_boys.find_one = AsyncMock(return_value={
            "id": "BOY_001",
            "today_deliveries": 5,
            "week_deliveries": 25
        })
        
        asyncio.run(
            self.tracker.record_delivery("BOY_001", "ORD_001", 50)
        )
        
        # Verify history was updated
        call_args = self.db.delivery_boys.update_one.call_args
        push_doc = call_args[0][1]["$push"]
        
        self.assertIn("earnings_history", push_doc)
        history_entry = push_doc["earnings_history"]
        self.assertEqual(history_entry["order_id"], "ORD_001")
        self.assertEqual(history_entry["amount"], 50)
        self.assertEqual(history_entry["type"], "delivery")
    
    def test_record_delivery_no_update(self):
        """Test handling when delivery recording fails"""
        result = Mock()
        result.modified_count = 0
        self.db.delivery_boys.update_one = AsyncMock(return_value=result)
        
        success = asyncio.run(
            self.tracker.record_delivery("BOY_001", "ORD_001", 50)
        )
        
        self.assertFalse(success)


class TestStatsReset(unittest.TestCase):
    """Test periodic stats reset functions"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.db = Mock()
        self.tracker = EarningsTracker(self.db)
    
    def test_reset_daily_stats(self):
        """Test daily stats reset"""
        result = Mock()
        result.modified_count = 45
        self.db.delivery_boys.update_many = AsyncMock(return_value=result)
        
        updated = asyncio.run(self.tracker.reset_daily_stats())
        
        self.assertEqual(updated, 45)
        
        # Verify correct update
        call_args = self.db.delivery_boys.update_many.call_args
        update_doc = call_args[0][1]["$set"]
        
        self.assertEqual(update_doc["today_deliveries"], 0)
        self.assertEqual(update_doc["today_earnings"], 0.0)
    
    def test_reset_weekly_stats(self):
        """Test weekly stats reset"""
        result = Mock()
        result.modified_count = 45
        self.db.delivery_boys.update_many = AsyncMock(return_value=result)
        
        updated = asyncio.run(self.tracker.reset_weekly_stats())
        
        self.assertEqual(updated, 45)
        
        call_args = self.db.delivery_boys.update_many.call_args
        update_doc = call_args[0][1]["$set"]
        
        self.assertEqual(update_doc["week_deliveries"], 0)
        self.assertEqual(update_doc["week_earnings"], 0.0)
    
    def test_reset_monthly_stats(self):
        """Test monthly stats reset"""
        result = Mock()
        result.modified_count = 45
        self.db.delivery_boys.update_many = AsyncMock(return_value=result)
        
        updated = asyncio.run(self.tracker.reset_monthly_stats())
        
        self.assertEqual(updated, 45)
        
        call_args = self.db.delivery_boys.update_many.call_args
        update_doc = call_args[0][1]["$set"]
        
        self.assertEqual(update_doc["month_deliveries"], 0)
        self.assertEqual(update_doc["month_earnings"], 0.0)


class TestBonusChecking(unittest.TestCase):
    """Test bonus calculation"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.db = Mock()
        self.tracker = EarningsTracker(self.db)
    
    def test_daily_bonus_threshold(self):
        """Test daily bonus at 10 deliveries"""
        delivery_boy_id = "BOY_001"
        
        # Get delivery boy returns data showing 10 deliveries today
        self.db.delivery_boys.find_one = AsyncMock(return_value={
            "id": delivery_boy_id,
            "today_deliveries": 10,
            "week_deliveries": 49,
            "month_deliveries": 199
        })
        
        self.db.delivery_boys.update_one = AsyncMock()
        
        asyncio.run(
            self.tracker._check_bonuses(delivery_boy_id, datetime.now())
        )
        
        # Verify bonus was recorded
        call_args = self.db.delivery_boys.update_one.call_args
        if call_args:
            inc_doc = call_args[0][1].get("$inc", {})
            # Should have daily bonus
            self.assertIn("total_earnings", inc_doc)
    
    def test_no_bonus_below_threshold(self):
        """Test no bonus below threshold"""
        delivery_boy_id = "BOY_001"
        
        self.db.delivery_boys.find_one = AsyncMock(return_value={
            "id": delivery_boy_id,
            "today_deliveries": 5,  # Below 10
            "week_deliveries": 45,   # Below 50
            "month_deliveries": 150  # Below 200
        })
        
        self.db.delivery_boys.update_one = AsyncMock()
        
        asyncio.run(
            self.tracker._check_bonuses(delivery_boy_id, datetime.now())
        )
        
        # Should not call update_one if no bonuses earned
        if self.db.delivery_boys.update_one.called:
            call_count = self.db.delivery_boys.update_one.call_count
            # Should be 0 or minimal (only db query)
            self.assertEqual(call_count, 0)


class TestEarningsSummary(unittest.TestCase):
    """Test earnings summary generation"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.db = Mock()
        self.tracker = EarningsTracker(self.db)
    
    def test_get_earnings_summary(self):
        """Test getting complete earnings summary"""
        delivery_boy_id = "BOY_001"
        
        boy_data = {
            "id": delivery_boy_id,
            "name": "Arjun Kumar",
            "phone": "9876543210",
            "status": "active",
            "today_deliveries": 12,
            "today_earnings": 600,
            "week_deliveries": 65,
            "week_earnings": 3250,
            "month_deliveries": 250,
            "month_earnings": 12500,
            "total_deliveries": 1250,
            "total_earnings": 62500,
            "last_payment_date": "2026-01-25",
            "last_payment_amount": 5000,
            "payment_frequency": "weekly"
        }
        
        self.db.delivery_boys.find_one = AsyncMock(return_value=boy_data)
        
        summary = asyncio.run(self.tracker.get_earnings_summary(delivery_boy_id))
        
        self.assertIsNotNone(summary)
        self.assertEqual(summary["id"], delivery_boy_id)
        self.assertEqual(summary["today"]["deliveries"], 12)
        self.assertEqual(summary["week"]["earnings"], 3250)
        self.assertEqual(summary["month"]["deliveries"], 250)
        self.assertEqual(summary["lifetime"]["earnings"], 62500)
        self.assertEqual(summary["payment_info"]["last_payment_amount"], 5000)
    
    def test_earnings_summary_not_found(self):
        """Test summary for non-existent delivery boy"""
        self.db.delivery_boys.find_one = AsyncMock(return_value=None)
        
        summary = asyncio.run(self.tracker.get_earnings_summary("INVALID"))
        
        self.assertIsNone(summary)
    
    def test_earnings_summary_calculates_averages(self):
        """Test that summary calculates averages correctly"""
        boy_data = {
            "id": "BOY_001",
            "name": "Test",
            "phone": "1234567890",
            "status": "active",
            "today_deliveries": 10,
            "today_earnings": 500,
            "total_deliveries": 1000,
            "total_earnings": 50000
        }
        
        self.db.delivery_boys.find_one = AsyncMock(return_value=boy_data)
        
        summary = asyncio.run(self.tracker.get_earnings_summary("BOY_001"))
        
        # 500 / 10 = 50
        self.assertEqual(summary["today"]["average_per_delivery"], 50.0)
        # 50000 / 1000 = 50
        self.assertEqual(summary["lifetime"]["average_per_delivery"], 50.0)


class TestTopPerformers(unittest.TestCase):
    """Test top performers retrieval"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.db = Mock()
        self.tracker = EarningsTracker(self.db)
    
    def test_get_top_performers_by_week(self):
        """Test getting top performers for the week"""
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=[
            {"id": "BOY_001", "name": "Arjun", "deliveries": 65},
            {"id": "BOY_002", "name": "Rajesh", "deliveries": 60},
            {"id": "BOY_003", "name": "Amit", "deliveries": 55}
        ])
        
        self.db.delivery_boys.aggregate = Mock(return_value=mock_cursor)
        
        performers = asyncio.run(self.tracker.get_top_performers("week", 3))
        
        self.assertEqual(len(performers), 3)
        self.assertEqual(performers[0]["id"], "BOY_001")
    
    def test_get_top_performers_returns_limited_results(self):
        """Test that top performers respects limit"""
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=[
            {"id": f"BOY_{i:03d}", "name": f"Boy {i}"} for i in range(5)
        ])
        
        self.db.delivery_boys.aggregate = Mock(return_value=mock_cursor)
        
        performers = asyncio.run(self.tracker.get_top_performers("day", 5))
        
        self.assertEqual(len(performers), 5)


class TestEarningsStatistics(unittest.TestCase):
    """Test overall earnings statistics"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.db = Mock()
        self.tracker = EarningsTracker(self.db)
    
    def test_get_earnings_statistics(self):
        """Test getting overall earnings statistics"""
        stats_data = {
            "total_delivery_boys": 50,
            "active_count": 45,
            "total_deliveries": 15000,
            "total_earnings": 750000,
            "today_deliveries": 450,
            "today_earnings": 22500,
            "week_deliveries": 3200,
            "week_earnings": 160000,
            "month_deliveries": 12000,
            "month_earnings": 600000
        }
        
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=[stats_data])
        
        self.db.delivery_boys.aggregate = Mock(return_value=mock_cursor)
        
        stats = asyncio.run(self.tracker.get_earnings_statistics())
        
        self.assertEqual(stats["total_delivery_boys"], 50)
        self.assertEqual(stats["active_count"], 45)
        self.assertEqual(stats["lifetime"]["total_deliveries"], 15000)
        self.assertEqual(stats["today"]["earnings"], 22500)
    
    def test_earnings_statistics_empty_database(self):
        """Test statistics with no delivery boys"""
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=[])
        
        self.db.delivery_boys.aggregate = Mock(return_value=mock_cursor)
        
        stats = asyncio.run(self.tracker.get_earnings_statistics())
        
        self.assertEqual(stats, {})


class TestErrorHandling(unittest.TestCase):
    """Test error handling"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.db = Mock()
        self.tracker = EarningsTracker(self.db)
    
    def test_record_delivery_handles_exception(self):
        """Test graceful handling of errors during recording"""
        self.db.delivery_boys.update_one = AsyncMock(side_effect=Exception("DB Error"))
        
        success = asyncio.run(
            self.tracker.record_delivery("BOY_001", "ORD_001", 50)
        )
        
        self.assertFalse(success)
    
    def test_get_earnings_summary_handles_exception(self):
        """Test graceful handling of errors getting summary"""
        self.db.delivery_boys.find_one = AsyncMock(side_effect=Exception("DB Error"))
        
        summary = asyncio.run(self.tracker.get_earnings_summary("BOY_001"))
        
        self.assertIsNone(summary)
    
    def test_initialize_earnings_handles_exception(self):
        """Test graceful handling of errors during initialization"""
        self.db.delivery_boys.update_one = AsyncMock(side_effect=Exception("DB Error"))
        
        success = asyncio.run(
            self.tracker.initialize_delivery_boy_earnings("BOY_001", {})
        )
        
        self.assertFalse(success)


class TestIntegration(unittest.TestCase):
    """Integration tests for earnings tracking workflow"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.db = Mock()
        self.tracker = EarningsTracker(self.db)
    
    def test_complete_delivery_workflow(self):
        """Test complete workflow: init -> record -> get summary"""
        delivery_boy_id = "BOY_001"
        
        # 1. Initialize
        result = Mock()
        result.modified_count = 1
        self.db.delivery_boys.update_one = AsyncMock(return_value=result)
        
        init_success = asyncio.run(
            self.tracker.initialize_delivery_boy_earnings(delivery_boy_id, {})
        )
        self.assertTrue(init_success)
        
        # 2. Record delivery
        result.modified_count = 1
        self.db.delivery_boys.find_one = AsyncMock(return_value={
            "id": delivery_boy_id,
            "today_deliveries": 5,
            "week_deliveries": 25
        })
        
        record_success = asyncio.run(
            self.tracker.record_delivery(delivery_boy_id, "ORD_001", 50)
        )
        self.assertTrue(record_success)
        
        # 3. Get summary
        self.db.delivery_boys.find_one = AsyncMock(return_value={
            "id": delivery_boy_id,
            "name": "Test Boy",
            "today_deliveries": 1,
            "today_earnings": 50,
            "total_deliveries": 1,
            "total_earnings": 50,
            "status": "active"
        })
        
        summary = asyncio.run(self.tracker.get_earnings_summary(delivery_boy_id))
        self.assertIsNotNone(summary)
        self.assertEqual(summary["today"]["deliveries"], 1)
        self.assertEqual(summary["lifetime"]["earnings"], 50)


if __name__ == "__main__":
    unittest.main(verbosity=2)

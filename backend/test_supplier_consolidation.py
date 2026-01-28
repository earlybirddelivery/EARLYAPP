# Phase 1.6: Supplier Consolidation Tests
# Comprehensive test suite for consolidation engine and analytics

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
import logging

logger = logging.getLogger(__name__)


class TestSupplierConsolidationEngine:
    """Test suite for supplier consolidation engine."""
    
    @pytest.fixture
    async def mock_db(self):
        """Create mock database for testing."""
        db = Mock()
        db.suppliers = AsyncMock()
        db.procurement_orders = AsyncMock()
        db.supplier_consolidation_audit = AsyncMock()
        return db
    
    @pytest.fixture
    def sample_suppliers(self):
        """Create sample suppliers for testing."""
        return [
            {
                "id": "sup1",
                "name": "ABC Suppliers",
                "email": "abc@suppliers.com",
                "phone": "9876543210",
                "address": "123 Main St",
                "products_supplied": ["prod1", "prod2"],
                "payment_terms": "Net 30",
                "is_active": True,
                "is_consolidated": False
            },
            {
                "id": "sup2",
                "name": "ABC Supplies",  # Similar name - potential duplicate
                "email": "abc.supplies@email.com",
                "phone": "9876543210",  # Same phone
                "address": "123 Main Street",
                "products_supplied": ["prod2", "prod3"],
                "payment_terms": "Net 30",
                "is_active": True,
                "is_consolidated": False
            },
            {
                "id": "sup3",
                "name": "XYZ Products Inc",
                "email": "xyz@products.com",
                "phone": "1234567890",
                "address": "456 Oak Ave",
                "products_supplied": ["prod4", "prod5"],
                "payment_terms": "COD",
                "is_active": True,
                "is_consolidated": False
            }
        ]
    
    @pytest.mark.asyncio
    async def test_find_duplicate_suppliers(self, mock_db, sample_suppliers):
        """Test duplicate supplier detection."""
        from backend.supplier_consolidation import SupplierConsolidationEngine
        
        mock_db.suppliers.find.return_value.to_list.return_value = sample_suppliers
        
        engine = SupplierConsolidationEngine(mock_db)
        duplicates = await engine.find_duplicate_suppliers()
        
        # Should find sup1 and sup2 as duplicates (same phone, similar name/email)
        assert len(duplicates) > 0
        assert any("sup1" in str(d) and "sup2" in str(d) for d in duplicates)
    
    @pytest.mark.asyncio
    async def test_calculate_match_confidence(self, mock_db):
        """Test match confidence calculation."""
        from backend.supplier_consolidation import SupplierConsolidationEngine
        
        engine = SupplierConsolidationEngine(mock_db)
        
        supplier1 = {
            "name": "ABC Suppliers",
            "email": "abc@suppliers.com",
            "phone": "9876543210",
            "products_supplied": ["prod1", "prod2"]
        }
        
        supplier2 = {
            "name": "ABC Supplies",
            "email": "abc@suppliers.com",
            "phone": "9876543210",
            "products_supplied": ["prod1", "prod2"]
        }
        
        confidence = await engine._calculate_match_confidence(supplier1, supplier2)
        
        # Should have high confidence (0.7+)
        assert confidence >= 0.7
    
    @pytest.mark.asyncio
    async def test_consolidate_suppliers_master_strategy(self, mock_db):
        """Test consolidation with master strategy."""
        from backend.supplier_consolidation import SupplierConsolidationEngine
        
        # Setup mocks
        mock_db.suppliers.find_one.side_effect = lambda query, *args, **kwargs: (
            {"id": "sup1", "name": "Master Supplier", "products_supplied": ["prod1"]},
            {"id": "sup2", "name": "Duplicate Supplier", "products_supplied": ["prod2"]}
        )
        mock_db.procurement_orders.find.return_value.to_list.return_value = []
        mock_db.suppliers.update_many.return_value = Mock(modified_count=5)
        mock_db.suppliers.update_one.return_value = Mock(modified_count=1)
        
        engine = SupplierConsolidationEngine(mock_db)
        result = await engine.consolidate_suppliers(
            "sup1",
            ["sup2"],
            "master"
        )
        
        assert result.get("status") == "success" or "error" not in result
    
    @pytest.mark.asyncio
    async def test_consolidate_suppliers_best_strategy(self, mock_db):
        """Test consolidation with best strategy."""
        from backend.supplier_consolidation import SupplierConsolidationEngine
        
        # Setup mocks
        mock_db.suppliers.find_one.return_value = {
            "id": "sup1",
            "name": "Supplier 1",
            "products_supplied": ["prod1"]
        }
        mock_db.procurement_orders.find.return_value.to_list.return_value = []
        mock_db.suppliers.update_many.return_value = Mock(modified_count=5)
        
        engine = SupplierConsolidationEngine(mock_db)
        result = await engine.consolidate_suppliers(
            "sup1",
            ["sup2"],
            "best"
        )
        
        # Should not error
        assert "error" not in result or result.get("status") == "success"
    
    @pytest.mark.asyncio
    async def test_consolidate_suppliers_combine_strategy(self, mock_db):
        """Test consolidation with combine strategy."""
        from backend.supplier_consolidation import SupplierConsolidationEngine
        
        # Setup mocks
        mock_db.suppliers.find_one.return_value = {
            "id": "sup1",
            "name": "Supplier 1",
            "products_supplied": ["prod1"]
        }
        mock_db.procurement_orders.find.return_value.to_list.return_value = []
        mock_db.suppliers.update_many.return_value = Mock(modified_count=5)
        
        engine = SupplierConsolidationEngine(mock_db)
        result = await engine.consolidate_suppliers(
            "sup1",
            ["sup2"],
            "combine"
        )
        
        # Should not error
        assert "error" not in result or result.get("status") == "success"
    
    @pytest.mark.asyncio
    async def test_get_consolidation_status(self, mock_db):
        """Test getting consolidation status."""
        from backend.supplier_consolidation import SupplierConsolidationEngine
        
        mock_db.suppliers.count_documents.side_effect = [10, 2, 1]  # total, consolidated, candidates
        mock_db.supplier_consolidation_audit.count_documents.return_value = 5
        
        engine = SupplierConsolidationEngine(mock_db)
        status = await engine.get_consolidation_status()
        
        assert status.get("total_suppliers") >= 0
        assert status.get("consolidation_candidates") >= 0
    
    @pytest.mark.asyncio
    async def test_get_consolidation_recommendations(self, mock_db, sample_suppliers):
        """Test getting consolidation recommendations."""
        from backend.supplier_consolidation import SupplierConsolidationEngine
        
        mock_db.suppliers.find.return_value.to_list.return_value = sample_suppliers
        
        engine = SupplierConsolidationEngine(mock_db)
        recommendations = await engine.get_consolidation_recommendations()
        
        # Should be a list
        assert isinstance(recommendations, list)
    
    @pytest.mark.asyncio
    async def test_get_supplier_quality_metrics(self, mock_db, sample_suppliers):
        """Test getting supplier quality metrics."""
        from backend.supplier_consolidation import SupplierConsolidationEngine
        
        mock_db.suppliers.find.return_value.to_list.return_value = sample_suppliers
        
        engine = SupplierConsolidationEngine(mock_db)
        metrics = await engine.get_supplier_quality_metrics()
        
        assert metrics.get("total_suppliers") == len(sample_suppliers)
        assert "completeness_score" in metrics or "data_quality" in metrics


class TestSupplierAnalyticsEngine:
    """Test suite for supplier analytics engine."""
    
    @pytest.fixture
    async def mock_db(self):
        """Create mock database for testing."""
        db = Mock()
        db.suppliers = AsyncMock()
        db.procurement_orders = AsyncMock()
        db.products = AsyncMock()
        return db
    
    @pytest.mark.asyncio
    async def test_get_individual_supplier_dashboard(self, mock_db):
        """Test getting individual supplier dashboard."""
        from backend.supplier_analytics import SupplierAnalyticsEngine
        
        supplier = {
            "id": "sup1",
            "name": "Test Supplier",
            "email": "test@supplier.com",
            "phone": "9876543210",
            "is_active": True,
            "products_supplied": ["prod1", "prod2"]
        }
        
        orders = [
            {
                "id": "ord1",
                "supplier_id": "sup1",
                "status": "delivered",
                "total_amount": 1000,
                "created_at": datetime.now() - timedelta(days=5)
            },
            {
                "id": "ord2",
                "supplier_id": "sup1",
                "status": "pending",
                "total_amount": 500,
                "created_at": datetime.now()
            }
        ]
        
        products = [
            {"id": "prod1", "name": "Product 1"},
            {"id": "prod2", "name": "Product 2"}
        ]
        
        mock_db.suppliers.find_one.return_value = supplier
        mock_db.procurement_orders.find.return_value.to_list.return_value = orders
        mock_db.products.find.return_value.to_list.return_value = products
        
        analytics = SupplierAnalyticsEngine(mock_db)
        dashboard = await analytics._get_individual_supplier_dashboard("sup1")
        
        assert dashboard.get("supplier_id") == "sup1"
        assert dashboard.get("order_metrics", {}).get("total_orders") == 2
        assert dashboard.get("order_metrics", {}).get("delivered") == 1
        assert dashboard.get("order_metrics", {}).get("pending") == 1
    
    @pytest.mark.asyncio
    async def test_get_system_supplier_dashboard(self, mock_db):
        """Test getting system-wide supplier dashboard."""
        from backend.supplier_analytics import SupplierAnalyticsEngine
        
        suppliers = [
            {"id": "sup1", "name": "Supplier 1", "is_active": True, "products_supplied": ["prod1"]},
            {"id": "sup2", "name": "Supplier 2", "is_active": True, "products_supplied": ["prod2"]}
        ]
        
        orders = [
            {"id": "ord1", "supplier_id": "sup1", "status": "delivered", "total_amount": 1000},
            {"id": "ord2", "supplier_id": "sup2", "status": "pending", "total_amount": 500}
        ]
        
        mock_db.suppliers.find.return_value.to_list.return_value = suppliers
        mock_db.procurement_orders.find.return_value.to_list.return_value = orders
        mock_db.suppliers.find_one.return_value = suppliers[0]
        
        analytics = SupplierAnalyticsEngine(mock_db)
        dashboard = await analytics._get_system_supplier_dashboard()
        
        assert dashboard.get("summary", {}).get("total_suppliers") == 2
        assert dashboard.get("summary", {}).get("total_orders") == 2
    
    @pytest.mark.asyncio
    async def test_get_supplier_product_mapping(self, mock_db):
        """Test getting supplier-product mapping."""
        from backend.supplier_analytics import SupplierAnalyticsEngine
        
        suppliers = [
            {"id": "sup1", "name": "Supplier 1", "products_supplied": ["prod1", "prod2"]},
            {"id": "sup2", "name": "Supplier 2", "products_supplied": ["prod1", "prod3"]}
        ]
        
        products = [
            {"id": "prod1", "name": "Product 1"},
            {"id": "prod2", "name": "Product 2"},
            {"id": "prod3", "name": "Product 3"}
        ]
        
        mock_db.suppliers.find.return_value.to_list.return_value = suppliers
        mock_db.products.find.return_value.to_list.return_value = products
        
        analytics = SupplierAnalyticsEngine(mock_db)
        mapping = await analytics.get_supplier_product_mapping()
        
        assert "summary" in mapping
        assert mapping.get("summary", {}).get("total_suppliers") == 2
        assert mapping.get("summary", {}).get("total_products") == 3
    
    @pytest.mark.asyncio
    async def test_get_supplier_comparison(self, mock_db):
        """Test comparing multiple suppliers."""
        from backend.supplier_analytics import SupplierAnalyticsEngine
        
        # Setup mocks for multiple suppliers
        mock_suppliers = [
            {
                "id": "sup1",
                "name": "Supplier 1",
                "email": "sup1@test.com",
                "phone": "9876543210",
                "is_active": True,
                "products_supplied": ["prod1"]
            },
            {
                "id": "sup2",
                "name": "Supplier 2",
                "email": "sup2@test.com",
                "phone": "9876543211",
                "is_active": True,
                "products_supplied": ["prod2"]
            }
        ]
        
        mock_db.suppliers.find_one.side_effect = lambda query, *args, **kwargs: mock_suppliers[
            0 if query.get("id") == "sup1" else 1
        ]
        mock_db.procurement_orders.find.return_value.to_list.return_value = []
        mock_db.products.find.return_value.to_list.return_value = []
        
        analytics = SupplierAnalyticsEngine(mock_db)
        comparison = await analytics.get_supplier_comparison(["sup1", "sup2"])
        
        assert comparison.get("suppliers_compared") == 2
    
    @pytest.mark.asyncio
    async def test_get_supplier_health_check(self, mock_db):
        """Test supplier system health check."""
        from backend.supplier_analytics import SupplierAnalyticsEngine
        
        suppliers = [
            {
                "id": "sup1",
                "name": "Supplier 1",
                "email": "sup1@test.com",
                "phone": "9876543210",
                "address": "123 Main St",
                "is_active": True,
                "products_supplied": ["prod1", "prod2"]
            }
        ]
        
        orders = [
            {"id": "ord1", "supplier_id": "sup1", "status": "delivered", "total_amount": 1000}
        ]
        
        mock_db.suppliers.find.return_value.to_list.return_value = suppliers
        mock_db.procurement_orders.find.return_value.to_list.return_value = orders
        
        analytics = SupplierAnalyticsEngine(mock_db)
        health = await analytics.get_supplier_health_check()
        
        assert "overall_health" in health


class TestBackfillSupplierConsolidation:
    """Test suite for backfill initialization."""
    
    @pytest.fixture
    async def mock_db(self):
        """Create mock database for testing."""
        db = Mock()
        db.suppliers = AsyncMock()
        db.users = AsyncMock()
        db.supplier_consolidation_audit = AsyncMock()
        db.create_collection = AsyncMock()
        db.list_collection_names = AsyncMock(return_value=[])
        return db
    
    @pytest.mark.asyncio
    async def test_initialize_consolidation_fields(self, mock_db):
        """Test consolidation fields initialization."""
        from backend.backfill_suppliers_consolidation import SupplierConsolidationBackfill
        
        mock_db.suppliers.find.return_value.to_list.return_value = [
            {"id": "sup1", "name": "Supplier 1"}
        ]
        mock_db.suppliers.update_many.return_value = Mock(modified_count=1)
        
        backfill = SupplierConsolidationBackfill(mock_db)
        result = await backfill.initialize_consolidation_fields()
        
        assert result.get("status") == "success"
    
    @pytest.mark.asyncio
    async def test_create_audit_collection(self, mock_db):
        """Test audit collection creation."""
        from backend.backfill_suppliers_consolidation import SupplierConsolidationBackfill
        
        mock_db.list_collection_names.return_value = []
        mock_db.create_collection.return_value = AsyncMock()
        
        backfill = SupplierConsolidationBackfill(mock_db)
        result = await backfill.create_audit_collection()
        
        assert result.get("status") == "success"
    
    @pytest.mark.asyncio
    async def test_link_suppliers_to_users(self, mock_db):
        """Test supplier-to-user linkage."""
        from backend.backfill_suppliers_consolidation import SupplierConsolidationBackfill
        
        suppliers = [
            {"id": "sup1", "name": "Supplier 1", "email": "sup1@test.com"}
        ]
        
        users = [
            {"id": "user1", "email": "sup1@test.com", "role": "supplier"}
        ]
        
        mock_db.suppliers.find.return_value.to_list.return_value = suppliers
        mock_db.users.find.return_value.to_list.return_value = users
        mock_db.suppliers.update_one.return_value = Mock(matched_count=1)
        
        backfill = SupplierConsolidationBackfill(mock_db)
        result = await backfill.link_suppliers_to_users()
        
        assert result.get("status") == "success"
        assert result.get("suppliers_linked") == 1


# Test execution
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])


# Export
__all__ = [
    "TestSupplierConsolidationEngine",
    "TestSupplierAnalyticsEngine",
    "TestBackfillSupplierConsolidation"
]

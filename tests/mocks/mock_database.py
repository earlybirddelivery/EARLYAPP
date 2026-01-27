"""
Mock Database Implementation for Testing Without MongoDB
Uses in-memory dictionaries to simulate database collections
"""

from datetime import datetime, date
from typing import Dict, List, Optional
import uuid

class MockCollection:
    """Simulates a MongoDB collection with in-memory storage"""

    def __init__(self, name: str):
        self.name = name
        self.data: Dict[str, dict] = {}

    async def find_one(self, query: dict, projection: Optional[dict] = None):
        """Find a single document"""
        # Simple query matching on exact field values
        for doc in self.data.values():
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                # Apply projection if provided
                if projection:
                    result = {}
                    for key in doc:
                        if projection.get(key, 1) == 1:
                            result[key] = doc[key]
                        elif projection.get(key) == 0:
                            continue
                    return result
                return doc.copy()
        return None

    async def find(self, query: Optional[dict] = None, projection: Optional[dict] = None):
        """Find multiple documents"""
        results = []
        query = query or {}

        for doc in self.data.values():
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                if projection:
                    result = {}
                    for key in doc:
                        if projection.get(key, 1) == 1:
                            result[key] = doc[key]
                        elif projection.get(key) == 0:
                            continue
                    results.append(result)
                else:
                    results.append(doc.copy())

        return MockCursor(results)

    async def insert_one(self, document: dict):
        """Insert a single document"""
        doc_id = document.get('id', str(uuid.uuid4()))
        document['id'] = doc_id
        self.data[doc_id] = document.copy()
        return MockInsertResult(doc_id)

    async def update_one(self, query: dict, update: dict):
        """Update a single document"""
        doc = await self.find_one(query)
        if doc:
            doc_id = doc['id']
            if '$set' in update:
                self.data[doc_id].update(update['$set'])
            return MockUpdateResult(1)
        return MockUpdateResult(0)

    async def delete_one(self, query: dict):
        """Delete a single document"""
        doc = await self.find_one(query)
        if doc:
            del self.data[doc['id']]
            return MockDeleteResult(1)
        return MockDeleteResult(0)

    async def count_documents(self, query: Optional[dict] = None):
        """Count documents matching query"""
        if not query:
            return len(self.data)

        count = 0
        for doc in self.data.values():
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                count += 1
        return count


class MockCursor:
    """Simulates a MongoDB cursor"""

    def __init__(self, data: List[dict]):
        self.data = data
        self.index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index >= len(self.data):
            raise StopAsyncIteration
        result = self.data[self.index]
        self.index += 1
        return result

    async def to_list(self, length: Optional[int] = None):
        """Convert cursor to list"""
        if length:
            return self.data[:length]
        return self.data.copy()


class MockInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class MockUpdateResult:
    def __init__(self, modified_count):
        self.modified_count = modified_count


class MockDeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count


class MockDatabase:
    """Simulates a MongoDB database with collections"""

    def __init__(self):
        self.collections: Dict[str, MockCollection] = {}

    def __getattr__(self, name: str):
        """Get or create collection"""
        if name not in self.collections:
            self.collections[name] = MockCollection(name)
        return self.collections[name]


# Create the mock database instance
mock_db = MockDatabase()


async def seed_mock_database():
    """Seed the mock database with initial test data"""
    # Use bcrypt directly for simpler password hashing
    import bcrypt

    def hash_pw(password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Create admin user
    await mock_db.users.insert_one({
        "id": "admin001",
        "email": "admin@earlybird.com",
        "password_hash": hash_pw("admin123"),
        "password": hash_pw("admin123"),  # Add both for compatibility
        "name": "Admin User",
        "role": "admin",
        "phone": "9876543210",
        "is_active": True,
        "created_at": datetime.now().isoformat()
    })

    # Create test customers
    customers = [
        {
            "id": "cust001",
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "9876543211",
            "address": "123 Main St, Area A",
            "area": "Area A",
            "is_active": True,
            "created_at": datetime.now().isoformat()
        },
        {
            "id": "cust002",
            "name": "Jane Smith",
            "email": "jane@example.com",
            "phone": "9876543212",
            "address": "456 Oak Ave, Area B",
            "area": "Area B",
            "is_active": True,
            "created_at": datetime.now().isoformat()
        }
    ]

    for customer in customers:
        await mock_db.customers.insert_one(customer)

    # Create test delivery boys
    delivery_boys = [
        {
            "id": "db001",
            "email": "delivery1@earlybird.com",
            "password_hash": hash_pw("delivery123"),
            "name": "Delivery Boy 1",
            "phone": "9876543213",
            "area": "Area A",
            "role": "delivery_boy",
            "is_active": True,
            "created_at": datetime.now().isoformat()
        },
        {
            "id": "db002",
            "email": "delivery2@earlybird.com",
            "password_hash": hash_pw("delivery123"),
            "name": "Delivery Boy 2",
            "phone": "9876543214",
            "area": "Area B",
            "role": "delivery_boy",
            "is_active": True,
            "created_at": datetime.now().isoformat()
        }
    ]

    for db_boy in delivery_boys:
        await mock_db.delivery_boys.insert_one(db_boy)
        # Also add to users collection for authentication
        await mock_db.users.insert_one(db_boy.copy())

    # Create test subscriptions
    subscriptions = [
        {
            "id": "sub001",
            "customer_id": "cust001",
            "product": "Milk",
            "quantity": 2,
            "unit": "liters",
            "frequency": "daily",
            "start_date": date.today().isoformat(),
            "status": "active",
            "price_per_unit": 30,
            "created_at": datetime.now().isoformat()
        },
        {
            "id": "sub002",
            "customer_id": "cust002",
            "product": "Milk",
            "quantity": 1,
            "unit": "liter",
            "frequency": "daily",
            "start_date": date.today().isoformat(),
            "status": "active",
            "price_per_unit": 30,
            "created_at": datetime.now().isoformat()
        }
    ]

    for subscription in subscriptions:
        await mock_db.subscriptions.insert_one(subscription)

    # Create areas
    areas = [
        {
            "id": "area001",
            "name": "Area A",
            "delivery_boy_id": "db001",
            "is_active": True
        },
        {
            "id": "area002",
            "name": "Area B",
            "delivery_boy_id": "db002",
            "is_active": True
        }
    ]

    for area in areas:
        await mock_db.areas.insert_one(area)

    print("Mock database seeded successfully!")
    print(f"- Users: {await mock_db.users.count_documents()}")
    print(f"- Customers: {await mock_db.customers.count_documents()}")
    print(f"- Delivery Boys: {await mock_db.delivery_boys.count_documents()}")
    print(f"- Subscriptions: {await mock_db.subscriptions.count_documents()}")
    print(f"- Areas: {await mock_db.areas.count_documents()}")


def get_mock_db():
    """Get the mock database instance"""
    return mock_db


# For compatibility with existing code that uses close_database
def close_mock_database():
    """Mock close function - no-op for in-memory database"""
    pass

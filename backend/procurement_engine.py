from datetime import date, timedelta
from typing import List, Dict, Tuple
from database import get_database

class ProcurementEngine:
    """Automated procurement and shortfall detection"""
    
    async def calculate_daily_requirement(self, target_date: date, product_id: str) -> Dict:
        """
        Calculate total product requirement for a specific date
        """
        db = await get_database()
        
        # Get all active subscriptions for this product
        subscriptions = await db.subscriptions.find({
            "product_id": product_id,
            "is_active": True
        }, {"_id": 0}).to_list(None)
        
        # Import here to avoid circular dependency
        from subscription_engine import subscription_engine
        
        total_quantity = 0
        customer_count = 0
        
        for sub in subscriptions:
            should_deliver, quantity = subscription_engine.should_deliver_today(sub, target_date)
            if should_deliver and quantity:
                total_quantity += quantity
                customer_count += 1
        
        # Get one-time orders for this date
        one_time_orders = await db.orders.find({
            "delivery_date": target_date.isoformat(),
            "order_type": "one_time",
            "status": {"$nin": ["cancelled"]}
        }, {"_id": 0}).to_list(None)
        
        for order in one_time_orders:
            for item in order.get('items', []):
                if item.get('product_id') == product_id:
                    total_quantity += item.get('quantity', 0)
                    customer_count += 1
        
        return {
            "product_id": product_id,
            "date": target_date.isoformat(),
            "total_quantity": total_quantity,
            "customer_count": customer_count
        }
    
    async def calculate_all_products_requirement(self, target_date: date) -> List[Dict]:
        """
        Calculate requirement for all products
        """
        db = await get_database()
        
        # Get all products
        products = await db.products.find({}, {"_id": 0}).to_list(None)
        
        requirements = []
        for product in products:
            req = await self.calculate_daily_requirement(target_date, product['id'])
            req['product_name'] = product['name']
            req['unit'] = product['unit']
            requirements.append(req)
        
        return requirements
    
    async def detect_shortfall(self, target_date: date) -> List[Dict]:
        """
        Detect shortfall by comparing requirement vs available inventory
        """
        db = await get_database()
        
        requirements = await self.calculate_all_products_requirement(target_date)
        shortfalls = []
        
        for req in requirements:
            product_id = req['product_id']
            required = req['total_quantity']
            
            # Get current inventory
            inventory = await db.inventory.find_one({
                "product_id": product_id,
                "date": target_date.isoformat()
            }, {"_id": 0})
            
            available = 0
            if inventory:
                available = inventory.get('closing_stock', 0)
            else:
                # Check previous day's closing stock
                prev_date = target_date - timedelta(days=1)
                prev_inventory = await db.inventory.find_one({
                    "product_id": product_id,
                    "date": prev_date.isoformat()
                }, {"_id": 0})
                if prev_inventory:
                    available = prev_inventory.get('closing_stock', 0)
            
            shortfall = max(0, required - available)
            
            if shortfall > 0:
                shortfalls.append({
                    "product_id": product_id,
                    "product_name": req['product_name'],
                    "required": required,
                    "available": available,
                    "shortfall": shortfall,
                    "unit": req['unit']
                })
        
        return shortfalls
    
    async def generate_procurement_plan(self, target_date: date, buffer_percentage: float = 10.0) -> List[Dict]:
        """
        Generate procurement plan with buffer stock
        """
        shortfalls = await self.detect_shortfall(target_date)
        
        procurement_plan = []
        for item in shortfalls:
            quantity_with_buffer = item['shortfall'] * (1 + buffer_percentage / 100)
            
            procurement_plan.append({
                "product_id": item['product_id'],
                "product_name": item['product_name'],
                "quantity": round(quantity_with_buffer, 2),
                "unit": item['unit'],
                "reason": f"Shortfall: {item['shortfall']} {item['unit']}, Buffer: {buffer_percentage}%"
            })
        
        return procurement_plan
    
    async def auto_create_procurement_order(self, target_date: date, supplier_id: str) -> Dict:
        """
        Automatically create procurement order based on shortfall
        """
        import uuid
        from datetime import datetime, timezone
        
        db = await get_database()
        
        # Get procurement plan
        plan = await self.generate_procurement_plan(target_date)
        
        if not plan:
            return {"message": "No procurement needed", "order": None}
        
        # Get supplier details
        supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
        
        if not supplier:
            raise ValueError(f"Supplier {supplier_id} not found")
        
        # Filter items that supplier can provide
        supplier_products = set(supplier.get('products_supplied', []))
        items = [item for item in plan if item['product_id'] in supplier_products]
        
        if not items:
            return {"message": "Supplier cannot fulfill any requirements", "order": None}
        
        # Get product prices and calculate total
        total_amount = 0.0
        for item in items:
            product = await db.products.find_one({"id": item['product_id']}, {"_id": 0})
            if product:
                item['price'] = product['price']
                item['total'] = item['quantity'] * product['price']
                total_amount += item['total']
        
        # Create procurement order
        order = {
            "id": str(uuid.uuid4()),
            "supplier_id": supplier_id,
            "date": target_date.isoformat(),
            "items": items,
            "total_amount": round(total_amount, 2),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.procurement_orders.insert_one(order)
        
        return {"message": "Procurement order created", "order": order}

# Singleton instance
procurement_engine = ProcurementEngine()

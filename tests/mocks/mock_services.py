import random
import math
from typing import List, Dict, Tuple
from datetime import datetime, timezone
import uuid

class MockMapsService:
    """Mock Google Maps API for geocoding, routing, and distance calculations"""
    
    def __init__(self):
        # Mock city coordinates
        self.city_coords = {
            "Mumbai": (19.0760, 72.8777),
            "Delhi": (28.7041, 77.1025),
            "Bangalore": (12.9716, 77.5946),
            "Chennai": (13.0827, 80.2707),
            "Default": (28.6139, 77.2090)
        }
    
    def geocode_address(self, address: str, city: str = "Default") -> Tuple[float, float]:
        """Return mock coordinates for an address"""
        base_lat, base_lng = self.city_coords.get(city, self.city_coords["Default"])
        # Add small random offset to simulate different addresses
        lat = base_lat + random.uniform(-0.1, 0.1)
        lng = base_lng + random.uniform(-0.1, 0.1)
        return round(lat, 6), round(lng, 6)
    
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two points using Haversine formula"""
        R = 6371  # Earth radius in kilometers
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        distance = R * c
        return round(distance, 2)
    
    def optimize_route(self, stops: List[Dict]) -> Tuple[List[Dict], float, int]:
        """Optimize route using nearest neighbor algorithm"""
        if len(stops) <= 1:
            return stops, 0.0, 0
        
        # Start from first stop (depot)
        optimized = [stops[0]]
        remaining = stops[1:].copy()
        total_distance = 0.0
        
        current = stops[0]
        
        while remaining:
            # Find nearest stop
            nearest_idx = 0
            min_distance = float('inf')
            
            for idx, stop in enumerate(remaining):
                dist = self.calculate_distance(
                    current['latitude'], current['longitude'],
                    stop['latitude'], stop['longitude']
                )
                if dist < min_distance:
                    min_distance = dist
                    nearest_idx = idx
            
            nearest = remaining.pop(nearest_idx)
            optimized.append(nearest)
            total_distance += min_distance
            current = nearest
        
        # Re-assign sequence numbers
        for idx, stop in enumerate(optimized):
            stop['sequence'] = idx + 1
        
        # Estimate duration (assuming 30 km/h average speed + 5 mins per stop)
        estimated_mins = int((total_distance / 30) * 60) + (len(stops) * 5)
        
        return optimized, round(total_distance, 2), estimated_mins

class MockOTPService:
    """Mock OTP service for authentication"""
    
    def __init__(self):
        self.otp_store = {}  # {phone: {otp, expires_at}}
    
    def send_otp(self, phone: str) -> str:
        """Generate and 'send' OTP (always returns 123456 for testing)"""
        otp = "123456"  # Deterministic OTP for testing
        expires_at = datetime.now(timezone.utc)
        
        self.otp_store[phone] = {
            "otp": otp,
            "expires_at": expires_at
        }
        
        print(f"[MOCK OTP] Sent OTP {otp} to {phone}")
        return otp
    
    def verify_otp(self, phone: str, otp: str) -> bool:
        """Verify OTP (always accepts 123456)"""
        if otp == "123456":
            return True
        
        stored = self.otp_store.get(phone)
        if not stored:
            return False
        
        return stored["otp"] == otp

class MockPaymentService:
    """Mock payment gateway"""
    
    def create_payment(self, amount: float, user_id: str, order_id: str = None) -> Dict:
        """Create mock payment"""
        payment_id = f"pay_mock_{uuid.uuid4().hex[:12]}"
        
        # Simulate 95% success rate
        success = random.random() < 0.95
        
        return {
            "id": payment_id,
            "amount": amount,
            "status": "completed" if success else "failed",
            "transaction_id": f"txn_{uuid.uuid4().hex[:16]}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    
    def verify_payment(self, payment_id: str) -> bool:
        """Verify payment status"""
        # Mock verification - always succeeds for testing
        return True
    
    def refund_payment(self, payment_id: str, amount: float) -> Dict:
        """Process refund"""
        return {
            "refund_id": f"rfnd_mock_{uuid.uuid4().hex[:12]}",
            "amount": amount,
            "status": "refunded",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

class MockStorageService:
    """Mock file storage (S3 alternative)"""
    
    def upload_file(self, file_data: bytes, filename: str, folder: str = "uploads") -> str:
        """Mock file upload"""
        # Return a mock URL
        file_id = uuid.uuid4().hex[:12]
        return f"https://mock-storage.earlybird.com/{folder}/{file_id}_{filename}"
    
    def delete_file(self, file_url: str) -> bool:
        """Mock file deletion"""
        print(f"[MOCK STORAGE] Deleted file: {file_url}")
        return True

class MockEmailService:
    """Mock email service"""
    
    def send_email(self, to: str, subject: str, body: str) -> bool:
        """Mock email sending"""
        print(f"[MOCK EMAIL] To: {to}")
        print(f"[MOCK EMAIL] Subject: {subject}")
        print(f"[MOCK EMAIL] Body: {body[:100]}...")
        return True
    
    def send_bulk_email(self, recipients: List[str], subject: str, body: str) -> bool:
        """Mock bulk email"""
        print(f"[MOCK EMAIL] Bulk email to {len(recipients)} recipients")
        print(f"[MOCK EMAIL] Subject: {subject}")
        return True

# Singleton instances
mock_maps = MockMapsService()
mock_otp = MockOTPService()
mock_payment = MockPaymentService()
mock_storage = MockStorageService()
mock_email = MockEmailService()

import requests
import json

# Test login endpoint
url = "http://localhost:8000/api/auth/login"
credentials = {
    "email": "admin@earlybird.com",
    "password": "admin123"
}

print("🔐 Testing login endpoint...")
print(f"URL: {url}")
print(f"Credentials: {credentials}")

try:
    response = requests.post(url, json=credentials)
    print(f"\n✓ Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"❌ Error: {e}")

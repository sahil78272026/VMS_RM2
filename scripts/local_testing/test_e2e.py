from fastapi.testclient import TestClient
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.main import app
from app.api.auth import active_account_required

def mock_auth():
    class MockUser:
        id = 1
        is_super_admin = True
        role = "super_admin"
    return MockUser()

app.dependency_overrides[active_account_required] = mock_auth

client = TestClient(app)
res = client.post("/api/v1/societies/2/batch-flats", json={
    "flat_numbers": ["10A", "10B", "10C"],
    "count": 10
})
print("Status:", res.status_code)
print("Response:", res.text)

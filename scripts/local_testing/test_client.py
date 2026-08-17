import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from fastapi.testclient import TestClient
from app.main import app

def run_test():
    client = TestClient(app)
    response = client.get("/api/v1/users?role=resident&status=active&society_id=1")
    print("STATUS:", response.status_code)
    print("JSON:", response.json())

if __name__ == "__main__":
    run_test()

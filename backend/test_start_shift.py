import requests

def run():
    # Login as guard
    res = requests.post("http://localhost:5000/api/v1/auth/login", json={
        "phone": "9999999992",  # Replace with actual guard phone if needed
        "password": "password123"
    })
    
    if res.status_code != 200:
        print("Login Failed:", res.json())
        return
        
    token = res.json()["data"]["access_token"]
    
    # Start shift at Gate 1
    res = requests.post("http://localhost:5000/api/v1/gate-sessions/start", json={
        "gate_id": 1
    }, headers={"Authorization": f"Bearer {token}"})
    
    print("Start Shift Response:", res.json())

run()

import requests
import json

login_res = requests.post("http://localhost:5000/api/v1/auth/login", json={
    "phone": "1111111111",
    "password": "1234"
})
if login_res.status_code == 200:
    data = login_res.json()
    token = data["data"]["access_token"]
    
    # 1. Gates
    gates_res = requests.get("http://localhost:5000/api/v1/gates", headers={
        "Authorization": f"Bearer {token}",
        "X-Society-Id": "1"
    })
    print("Gates:", gates_res.status_code, gates_res.text)

    # 2. Guards
    guards_res = requests.get("http://localhost:5000/api/v1/guards", headers={
        "Authorization": f"Bearer {token}",
        "X-Society-Id": "1"
    })
    print("Guards:", guards_res.status_code, guards_res.text)
else:
    print("Login:", login_res.status_code, login_res.text[:100])

import requests

login_res = requests.post("http://localhost:5000/api/v1/auth/login", json={
    "phone": "1111111111",
    "password": "1234"
})
token = login_res.json()["data"]["access_token"]
guards_res = requests.get("http://localhost:5000/api/v1/guards?society_id=", headers={
    "Authorization": f"Bearer {token}"
})
print(guards_res.status_code, guards_res.text[:200])

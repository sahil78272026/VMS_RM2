import requests

login_res = requests.post("http://localhost:5000/api/v1/auth/login", json={
    "phone": "1111111111",
    "password": "1234"
})
refresh_token = login_res.json()["data"]["refresh_token"]

refresh_res = requests.post("http://localhost:5000/api/v1/auth/refresh", headers={
    "Authorization": f"Bearer {refresh_token}"
})
print("Refresh:", refresh_res.status_code, refresh_res.text[:200])

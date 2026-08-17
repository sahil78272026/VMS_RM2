import requests

login_res = requests.post("http://localhost:5000/api/v1/auth/login", json={
    "phone": "1111111111",
    "password": "1234"
})
token = login_res.json()["data"]["access_token"]

# Frontend request:
gates_res = requests.get("http://localhost:5000/api/v1/gates", headers={
    "Authorization": f"Bearer {token}",
    "X-Society-ID": "null" # Simulate what api.ts might send
})
print("Gates:", gates_res.text)

guards_res = requests.get("http://localhost:5000/api/v1/guards?per_page=50", headers={
    "Authorization": f"Bearer {token}",
    "X-Society-ID": "null"
})
print("Guards:", guards_res.text)

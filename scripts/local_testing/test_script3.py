import requests

login_res = requests.post("http://localhost:5000/api/v1/auth/login", json={
    "phone": "1111111111",
    "password": "1234"
})
token = login_res.json()["data"]["access_token"]

import jwt
# Try decoding it with Python to see what's inside
print(jwt.decode(token, options={"verify_signature": False}))

gates_res = requests.get("http://localhost:5000/api/v1/gates", headers={
    "Authorization": f"Bearer {token}"
})
print("Gates HTTP:", gates_res.status_code)
print("Gates Body:", gates_res.text)

guards_res = requests.get("http://localhost:5000/api/v1/guards", headers={
    "Authorization": f"Bearer {token}"
})
print("Guards HTTP:", guards_res.status_code)
print("Guards Body:", guards_res.text)


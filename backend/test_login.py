import requests

res = requests.post("http://localhost:5000/api/v1/auth/verify-otp", json={
    "phone": "0000000000",
    "otp": "123456"
})
print(res.json())

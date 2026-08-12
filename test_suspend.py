import requests

# login as superadmin
login_res = requests.post("http://localhost:5000/api/v1/auth/login", json={
    "phone": "9999999999",
    "password": "1234"
})
data = login_res.json()
print("Login:", data)

if "data" in data and "access_token" in data["data"]:
    token = data["data"]["access_token"]
    
    # create society
    soc_res = requests.post("http://localhost:5000/api/v1/societies", headers={
        "Authorization": f"Bearer {token}"
    }, json={
        "name": "Test Society",
        "slug": "test-soc",
        "city": "Noida",
        "pincode": "201301"
    })
    print("Create:", soc_res.json())
    soc_id = soc_res.json().get("data", {}).get("id")

    if soc_id:
        sus_res = requests.post(f"http://localhost:5000/api/v1/societies/{soc_id}/suspend", headers={
            "Authorization": f"Bearer {token}"
        })
        print("Suspend:", sus_res.json())

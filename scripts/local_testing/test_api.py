import requests
res = requests.post(
    "http://127.0.0.1:5000/api/v1/societies/2/batch-flats",
    json={"flat_numbers": ["1A", "1B"], "count": 10},
    headers={"Authorization": "Bearer TEST"}
)
print("Status:", res.status_code)
print("Response:", res.text)

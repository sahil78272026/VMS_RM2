import requests
flats = [str(i) for i in range(1, 256)]
all_flats = []
for f in flats:
    all_flats.extend([f, f+"A", f+"B"])

print(f"Total sending: {len(all_flats)}")
res = requests.post(
    "http://127.0.0.1:8000/api/v1/societies/2/batch-flats",
    json={"flat_numbers": all_flats},
    headers={"Authorization": "Bearer TEST"} # Wait, I don't have a token.
)
print(res.status_code, res.text)

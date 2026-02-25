import requests

url = "http://localhost:5000//api/residents/me/pending"

response = requests.get(url)

print(response.json())
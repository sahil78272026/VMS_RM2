import os
import sys

# Ensure backend directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import FlatUser, Flat, User

db = SessionLocal()

print("--- ALL FLATS ---")
flats = db.query(Flat).all()
for f in flats:
    print(f"Flat ID: {f.id}, Number: '{f.flat_number}', Status: {f.status}")

print("\n--- FLAT USERS ---")
flat_users = db.query(FlatUser).all()
for fu in flat_users:
    user = db.query(User).filter_by(id=fu.user_id).first()
    print(f"FlatUser ID: {fu.id}, Flat ID: {fu.flat_id}, Role: {fu.role}, User: {user.name if user else 'Unknown'}")

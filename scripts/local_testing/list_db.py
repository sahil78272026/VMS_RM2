import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import User, Society

db = SessionLocal()
print("SOCIETIES:")
for s in db.query(Society).all():
    print(f"ID: {s.id}, Name: {s.name}")

print("\nUSERS:")
for u in db.query(User).all():
    print(f"ID: {u.id}, Phone: {u.phone}, Role: {u.role}")

db.close()

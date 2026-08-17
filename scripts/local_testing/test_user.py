import sys, os, json
sys.path.append(os.getcwd())
from app.database import SessionLocal
from app.models import User
db = SessionLocal()
user = db.query(User).get(17)
print("User 17 allow_guard_force_entry:", user.allow_guard_force_entry)
db.close()

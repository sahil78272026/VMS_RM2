import sys, os, json
sys.path.append(os.getcwd())
from app.database import SessionLocal
from app.models import User
db = SessionLocal()
users = db.query(User).all()
print(json.dumps([{"id": u.id, "name": u.name, "role": u.role, "force": u.allow_guard_force_entry} for u in users], indent=2))
db.close()

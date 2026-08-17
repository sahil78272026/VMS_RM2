import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models import User

db = SessionLocal()
u = db.query(User).get(13)
u.allow_guard_force_entry = True
db.commit()
print("Updated user 13")
db.close()

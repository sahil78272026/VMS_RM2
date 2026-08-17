from app.database import SessionLocal
from app.models import User

db = SessionLocal()
users = db.query(User).filter(User.phone.in_(['8285748373', '8287748373'])).all()
for u in users:
    u.allow_guard_force_entry = True
db.commit()
print(f"Updated force entry for {len(users)} users.")

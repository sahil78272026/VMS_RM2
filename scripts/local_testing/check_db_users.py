from app.database import SessionLocal
from app.models import User

db = SessionLocal()
users = db.query(User).filter(User.phone == "0000000000").all()
for u in users:
    print(f"ID: {u.id}, Role: {u.role}, is_super: {u.is_super_admin}")
db.close()

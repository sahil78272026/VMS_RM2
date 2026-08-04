from app.database import SessionLocal
from app.models import User

db = SessionLocal()
user = db.query(User).filter(User.phone == "0000000000").first()
if user:
    print(f"User ID: {user.id}")
    print(f"Name: {user.name}")
    print(f"Role: {user.role}")
    print(f"is_super_admin: {user.is_super_admin}")
else:
    print("User with phone 0000000000 not found.")
db.close()

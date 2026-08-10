import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import User
db = SessionLocal()
user = db.query(User).filter_by(phone='1111111111').first()
if user:
    print(user.to_dict())
else:
    print("User not found.")

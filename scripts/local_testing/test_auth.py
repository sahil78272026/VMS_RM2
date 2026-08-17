import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import User
db = SessionLocal()
user = db.query(User).first()
if user:
    print(user.to_dict())

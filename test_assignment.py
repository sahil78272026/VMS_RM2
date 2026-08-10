import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import User, FlatUser
db = SessionLocal()
user = db.query(User).filter_by(phone='8285748373').first()
if user:
    print("User:", user.to_dict())
    flat_user = db.query(FlatUser).filter_by(user_id=user.id).first()
    if flat_user:
        print("FlatUser:", flat_user.to_dict())
    else:
        print("No FlatUser found.")
else:
    print("User not found.")

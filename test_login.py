import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import User
from app.services.auth_service import AuthService
db = SessionLocal()
user = db.query(User).filter_by(phone='1111111111').first()
if user:
    auth = AuthService(db)
    socs = auth.get_user_societies(user)
    print("Socs:", socs)

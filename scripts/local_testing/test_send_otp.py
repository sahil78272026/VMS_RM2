import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.services.auth_service import AuthService

db = SessionLocal()
service = AuthService(db)
try:
    res = service.send_otp("8285748373")
    print("SUCCESS", res)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()

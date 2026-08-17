import sys
sys.path.append('.')
from app.database import SessionLocal
from app.services.auth_service import AuthService
from sqlalchemy.orm import Session

db = SessionLocal()
auth_service = AuthService(db)
try:
    res = auth_service.login('9999999999', 'admin')
    print("SUCCESS", res)
except Exception as e:
    print("FAILED", e)

import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import User

db = SessionLocal()
sa = db.query(User).filter_by(is_super_admin=True).first()
if sa:
    print(sa.phone)
else:
    print("None")

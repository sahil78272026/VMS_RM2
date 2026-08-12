import os
import sys

# Ensure backend directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import FlatUser, Flat

db = SessionLocal()
f1 = db.query(Flat).filter_by(id=1).first()
if f1:
    print(f"Flat 1: {f1.flat_number} (Society: {f1.society_id}) status: {f1.status}")
    fu = db.query(FlatUser).filter_by(flat_id=1).all()
    for f in fu:
        print(f"FlatUser: user_id={f.user_id}, role={f.role}, can_approve={f.can_approve}")
else:
    print("Flat 1 not found.")

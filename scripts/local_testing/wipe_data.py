import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import User, Society, Flat, Gate, Guard, VisitorLog

db = SessionLocal()

print("Deleting all societies except ID 1 (RM2) and ID 2 (Palm Heights)...")
db.query(Flat).filter(~Flat.society_id.in_([1, 2])).delete(synchronize_session=False)
db.query(Gate).filter(~Gate.society_id.in_([1, 2])).delete(synchronize_session=False)

# delete users except super admin
print("Deleting all users except Super Admin (ID 1) and Admin (ID 13)...")
db.query(User).filter(~User.id.in_([1, 13])).delete(synchronize_session=False)

db.query(Society).filter(~Society.id.in_([1, 2])).delete(synchronize_session=False)

db.commit()

print("Remaining Societies:", db.query(Society).count())
print("Remaining Flats:", db.query(Flat).count())
print("Remaining Users:", db.query(User).count())

db.close()

import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import User, Society, Flat, Gate, Guard, VisitorLog

db = SessionLocal()

print("Deleting all flats, gates, guards, and visitors...")
db.query(VisitorLog).delete()
db.query(Guard).delete()
db.query(Gate).delete()
db.query(Flat).delete()

print("Deleting all societies...")
db.query(Society).delete()

print("Deleting all users except Super Admin (ID 1)...")
db.query(User).filter(User.id != 1).delete()

db.commit()

print("Remaining Societies:", db.query(Society).count())
print("Remaining Flats:", db.query(Flat).count())
print("Remaining Users:", db.query(User).count())
print("Remaining Guards:", db.query(Guard).count())
print("Remaining Visitors:", db.query(VisitorLog).count())

db.close()

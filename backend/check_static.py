import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import User, Society, Flat, Gate, Guard, VisitorLog

db = SessionLocal()
print("Users:", db.query(User).count())
print("Societies:", db.query(Society).count())
print("Flats:", db.query(Flat).count())
print("Gates:", db.query(Gate).count())
print("Guards:", db.query(Guard).count())
print("VisitorLogs:", db.query(VisitorLog).count())
db.close()

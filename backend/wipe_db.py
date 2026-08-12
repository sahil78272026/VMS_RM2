import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal, engine
from app.models import (
    Base, User, Society, Flat, FlatUser, Guard, 
    Visitor, VisitorLog, PreApproval, FrequentPass, 
    VisitorRating, Notification, GateSession, Gate
)

db = SessionLocal()

try:
    print("Deleting notifications...")
    db.query(Notification).delete()
    print("Deleting gate sessions...")
    db.query(GateSession).delete()
    print("Deleting visitor ratings...")
    db.query(VisitorRating).delete()
    print("Deleting frequent passes...")
    db.query(FrequentPass).delete()
    print("Deleting pre-approvals...")
    db.query(PreApproval).delete()
    print("Deleting visitor logs...")
    db.query(VisitorLog).delete()
    print("Deleting visitors...")
    db.query(Visitor).delete()
    print("Deleting guards...")
    db.query(Guard).delete()
    print("Deleting flat users...")
    db.query(FlatUser).delete()
    print("Deleting flats...")
    db.query(Flat).delete()
    print("Deleting gates...")
    db.query(Gate).delete()
    print("Deleting non-superadmin users...")
    db.query(User).filter(User.is_super_admin == False).delete()
    print("Deleting societies...")
    db.query(Society).delete()

    db.commit()
    print("Database wiped successfully. Only Super Admin remains.")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()

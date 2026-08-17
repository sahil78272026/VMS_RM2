import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models import VisitorLog, FlatUser, User, Flat

db = SessionLocal()
logs = db.query(VisitorLog).all()
for log in logs:
    print(f"Log {log.id}: {log.visitor.name} to Flat {log.flat.flat_number}")
    if log.flat_user and log.flat_user.user:
        print(f" - Resident: {log.flat_user.user.name}, allow_guard_force_entry: {log.flat_user.user.allow_guard_force_entry}")
    else:
        print(" - No primary resident found for this log")
db.close()

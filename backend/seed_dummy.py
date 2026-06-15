import os
import bcrypt
from app.database import SessionLocal
from app.models import User, Flat

def run():
    db = SessionLocal()
    
    # Create Guard
    exists_guard = db.query(User).filter_by(phone="8888888888").first()
    if not exists_guard:
        guard = User(
            name="Security Guard 1",
            phone="8888888888",
            email="guard1@rm2society.in",
            password_hash=bcrypt.hashpw("Guard@123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
            role="guard",
            status="active"
        )
        db.add(guard)
        
    # Create Resident
    exists_res = db.query(User).filter_by(phone="7777777777").first()
    if not exists_res:
        flat = db.query(Flat).filter_by(flat_number="101").first()
        res = User(
            name="Test Resident",
            phone="7777777777",
            email="resident@rm2society.in",
            password_hash=bcrypt.hashpw("Resident@123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
            role="resident",
            status="active",
            flat_id=flat.id if flat else None
        )
        db.add(res)
        
    db.commit()
    print("Dummy credentials created!")

if __name__ == "__main__":
    run()

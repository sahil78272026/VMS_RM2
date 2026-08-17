import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import (
    VisitorLog, PreApproval, FrequentPass,
    MaintenanceBill, MaintenancePayment, PanicAlert, Announcement,
    FlatUser, Guard, User, Flat, Society, SocietyAdmin, Gate
)

def deep_wipe():
    db = SessionLocal()
    try:
        print("Starting deep wipe...")
        
        # 1. Delete all transactional logs
        db.query(VisitorLog).delete()
        db.query(PreApproval).delete()
        db.query(FrequentPass).delete()
        db.query(MaintenancePayment).delete()
        db.query(MaintenanceBill).delete()
        db.query(PanicAlert).delete()
        db.query(Announcement).delete()
        
        print("Deleted all logs and transactions.")
        
        # 2. Delete all mappings
        db.query(FlatUser).delete()
        db.query(SocietyAdmin).delete()
        db.query(Guard).delete()
        
        print("Deleted all user-to-society mappings (SocietyAdmin, FlatUser, Guard).")
        
        # Clear foreign keys on users before deleting flats
        db.query(User).update({"requested_flat_id": None})
        
        # 3. Delete structural dynamic data
        db.query(Flat).delete()
        db.query(Gate).delete()
        
        print("Deleted all Flats and Gates.")
        
        # 4. Delete all users EXCEPT super admins
        deleted_users = db.query(User).filter(User.is_super_admin == False).delete(synchronize_session=False)
        print(f"Deleted {deleted_users} non-super-admin users.")
        
        db.commit()
        print("Successfully wiped all data! Only Super Admins and Societies remain.")
        
    except Exception as e:
        db.rollback()
        print(f"Error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    deep_wipe()

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal, engine
from app.models import (
    VisitorLog, PreApproval, FrequentPass,
    MaintenanceBill, MaintenancePayment, PanicAlert, Announcement,
    FlatUser, Guard, User, Flat, Society, SocietyAdmin, Gate, Visitor, VisitorRating, Notification
)
import sqlalchemy as sa

def super_wipe():
    db = SessionLocal()
    try:
        print("Starting SUPER wipe...")
        
        # Disable foreign key checks for PostgreSQL
        db.execute(sa.text("SET session_replication_role = 'replica';"))

        # Clear all tables except Users
        tables = [
            VisitorLog, PreApproval, FrequentPass,
            MaintenancePayment, MaintenanceBill, PanicAlert, Announcement,
            FlatUser, SocietyAdmin, Guard, VisitorRating, Notification,
            Gate, Flat, Visitor, Society
        ]

        for table in tables:
            db.query(table).delete(synchronize_session=False)
            print(f"Cleared {table.__tablename__}")
            
        # Delete non-super admins
        db.query(User).filter(User.phone != '0000000000').delete(synchronize_session=False)
        print("Cleared all non-superadmin users")

        db.execute(sa.text("SET session_replication_role = 'origin';"))
        
        db.commit()
        print("Database wiped successfully! Only superadmin 0000000000 remains.")
        
    except Exception as e:
        db.rollback()
        db.execute(sa.text("SET session_replication_role = 'origin';"))
        print(f"Error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    super_wipe()

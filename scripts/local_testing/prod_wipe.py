import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import (
    VisitorLog, PreApproval, FrequentPass,
    MaintenanceBill, MaintenancePayment, PanicAlert, Announcement,
    FlatUser, Guard, User, Flat, Society, SocietyAdmin, Gate, Visitor, VisitorRating, Notification
)
import sqlalchemy as sa

def prod_wipe():
    db = SessionLocal()
    try:
        print("Starting PROD wipe...")
        
        # TRUNCATE CASCADE will drop data in these tables and any dependent tables instantly.
        # We leave users intact for a moment.
        table_names = [
            VisitorLog.__tablename__, PreApproval.__tablename__, FrequentPass.__tablename__,
            MaintenancePayment.__tablename__, MaintenanceBill.__tablename__, PanicAlert.__tablename__, Announcement.__tablename__,
            FlatUser.__tablename__, SocietyAdmin.__tablename__, Guard.__tablename__, VisitorRating.__tablename__, Notification.__tablename__,
            Gate.__tablename__, Flat.__tablename__, Visitor.__tablename__, Society.__tablename__
        ]
        
        truncate_sql = f"TRUNCATE TABLE {', '.join(table_names)} CASCADE;"
        db.execute(sa.text(truncate_sql))
        print("Truncated all society-related tables.")
            
        # Delete non-super admins
        db.query(User).filter(User.phone != '0000000000').delete(synchronize_session=False)
        print("Cleared all non-superadmin users")

        db.commit()
        print("Database wiped successfully! Only superadmin 0000000000 remains.")
        
    except Exception as e:
        db.rollback()
        print(f"Error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    prod_wipe()

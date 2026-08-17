import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal, engine
from app.models import Base, User

db = SessionLocal()

try:
    print("Nullifying users.requested_flat_id...")
    db.query(User).update({User.requested_flat_id: None})
    db.commit()
    
    for table in reversed(Base.metadata.sorted_tables):
        if table.name == "users":
            continue
        print(f"Deleting {table.name}...")
        db.execute(table.delete())
    
    # Now for users, keep only super admin
    print("Deleting non-superadmin users...")
    db.query(User).filter(User.is_super_admin == False).delete()
    
    db.commit()
    print("Database wiped successfully. Only Super Admin remains.")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()

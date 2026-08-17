import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import User, Flat, FlatUser, Guard

def test_query():
    db = SessionLocal()
    target_society_id = 1
    role = "resident"
    status = "active"
    try:
        q = db.query(User)
        q = q.filter(User.role == role)
        q = q.filter(User.status == status)
        
        flat_ids_in_soc = db.query(Flat.id).filter(Flat.society_id == target_society_id)
        flat_user_ids = db.query(FlatUser.user_id).filter(FlatUser.society_id == target_society_id)
        q = q.filter(
            (User.id.in_(flat_user_ids)) | (User.requested_flat_id.in_(flat_ids_in_soc))
        )
        users = q.all()
        print("Success! Users:", users)
    except Exception as e:
        print("Error executing query:", e)
    finally:
        db.close()

if __name__ == "__main__":
    test_query()

import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models import Guard, User, GateSession

def run():
    db = SessionLocal()
    try:
        # Delete gate sessions first to avoid foreign key constraints
        deleted_sessions = db.query(GateSession).delete()
        
        guards = db.query(Guard).all()
        user_ids = [g.user_id for g in guards]
        
        deleted_guards = db.query(Guard).delete()
        
        # Delete the corresponding users (since role="guard")
        if user_ids:
            deleted_users = db.query(User).filter(User.id.in_(user_ids), User.role == 'guard').delete(synchronize_session=False)
        else:
            deleted_users = 0
            
        db.commit()
        print(f"Deleted {deleted_sessions} gate sessions.")
        print(f"Deleted {deleted_guards} guards.")
        print(f"Deleted {deleted_users} guard users.")
    except Exception as e:
        db.rollback()
        print("Error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    run()

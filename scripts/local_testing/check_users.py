import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import User, SocietyAdmin, FlatUser, Society

def check_user():
    db = SessionLocal()
    users = db.query(User).filter(User.role.in_(["super_admin", "admin"])).all()
    print(f"Total Admin/SuperAdmin users: {len(users)}")
    for u in users:
        print(f"User {u.id}: {u.name} | Phone: {u.phone} | Role: {u.role} | SuperAdmin: {u.is_super_admin}")
        admins = db.query(SocietyAdmin).filter_by(user_id=u.id).all()
        for sa in admins:
            soc = db.query(Society).filter_by(id=sa.society_id).first()
            print(f"  -> SocietyAdmin for: {soc.name if soc else sa.society_id}")
        flats = db.query(FlatUser).filter_by(user_id=u.id).all()
        for fu in flats:
            print(f"  -> FlatUser in society: {fu.society_id}")
            
if __name__ == "__main__":
    check_user()

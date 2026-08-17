import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import User, SocietyAdmin, Society

def show_society_admins():
    db = SessionLocal()
    user = db.query(User).filter_by(phone="9999999999").first()
    if user:
        print(f"Found exactly ONE user in 'users' table: ID {user.id}, Phone {user.phone}")
        print("Now checking 'society_admins' mapping table...")
        
        admins = db.query(SocietyAdmin).filter_by(user_id=user.id).all()
        for admin in admins:
            soc = db.query(Society).filter_by(id=admin.society_id).first()
            print(f"Mapping entry: User ID {admin.user_id} is linked to Society ID {admin.society_id} ({soc.name})")
    else:
        print("User not found.")

if __name__ == "__main__":
    show_society_admins()

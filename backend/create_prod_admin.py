import os
from app.database import SessionLocal
from app.models import User
import bcrypt

def create_superadmin():
    db = SessionLocal()
    phone = "0000000000"
    password = "admin"
    
    # check if exists
    user = db.query(User).filter(User.phone == phone).first()
    if user:
        print(f"Superadmin with phone {phone} already exists!")
        db.close()
        return

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    
    new_user = User(
        name="Platform Super Admin",
        phone=phone,
        email="admin@example.com",
        password_hash=password_hash,
        role="super_admin",
        is_super_admin=True,
        status="active"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    print(f"Superadmin created successfully with ID: {new_user.id} and phone: {phone}")
    db.close()

if __name__ == "__main__":
    create_superadmin()

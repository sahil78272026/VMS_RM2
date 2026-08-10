import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import User, Flat, FlatUser
from datetime import date
db = SessionLocal()
user = db.query(User).filter_by(phone='8285748373').first()
if user:
    flat = db.query(Flat).filter(Flat.flat_number.ilike('%23b%')).first()
    if flat:
        print("Found flat:", flat.flat_number)
        fu = FlatUser(
            society_id=flat.society_id,
            user_id=user.id,
            flat_id=flat.id,
            role="primary",
            is_owner=True,
            can_approve=True,
            move_in_date=date.today()
        )
        db.add(fu)
        flat.status = 'occupied'
        db.commit()
        print("Successfully assigned.")
    else:
        print("Flat not found.")
else:
    print("User not found.")

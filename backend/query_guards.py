from app.database import SessionLocal
from app.models import Guard, User
db = SessionLocal()
guards = db.query(Guard).all()
for g in guards:
    user = db.query(User).filter_by(id=g.user_id).first()
    print(f"Guard ID: {g.id}, Society ID: {g.society_id}, User ID: {g.user_id}, Name: {user.name if user else 'None'}, Phone: {user.phone if user else 'None'}")
